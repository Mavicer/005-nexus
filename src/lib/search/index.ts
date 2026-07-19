/**
 * 搜索模块（护栏2 — Agent B 第 5 条）
 *
 * 搜索逻辑封装在本单一模块，上层 API/页面只调 searchItems()，不直接写 SQL。
 * 将来换 Meilisearch 只改本模块，不动调用方。
 *
 * MVP 实现：PostgreSQL
 *   - tsvector 路径：info_items.search_vector @@ plainto_tsquery('simple', q)
 *   - pg_trgm 兜底路径：title/aliases/summary ILIKE '%q%'
 *
 * 为什么双路径（Agent B Review 必改1）：
 *   'simple' ts_config 不分词中文 —— to_tsvector('simple','全国大学生数学建模竞赛')
 *   产出单个整串 token，plainto_tsquery('simple','数学建模') 匹配不到。
 *   故 MVP 在 'simple' 兜底下用 ILIKE 补齐中文召回。search_vector tsvector 列保留
 *   （给未来 pg_jieba 升级用，平滑路径不丢）。
 *
 *   切 pg_jieba = 一次重建 generated column 的 migration
 *   （DROP 列 + RECREATE with pg_jieba ts_config + 重建 GIN + 全表重 tokenize，
 *    非零成本；架构上仍平滑，只动 search 模块 + 一个 migration）。
 */
import { sql, and, eq, or, ilike, type SQL } from "drizzle-orm";

import { db } from "@/db/client";
import { infoItems, competitions } from "@/db/schema";
import type { InfoCategory } from "@/db/schema-enums";

export type CompetitionLevel =
  | "school"
  | "provincial"
  | "national"
  | "international";
export type CompetitionRecognition =
  | "official_A"
  | "leaderboard_listed"
  | "normal";
export type SearchSortBy = "relevance" | "credibility" | "closing";

export interface SearchFilters {
  category?: InfoCategory;
  level?: CompetitionLevel;
  recognition?: CompetitionRecognition;
  /** 适合年级（数组包含匹配，如 "大二"） */
  suitableGrade?: string;
  /** 即将截止：返回 N 天内报名截止的，null=不限 */
  closingWithinDays?: number;
}

export interface SearchSort {
  by?: SearchSortBy;
}

export interface SearchParams {
  query?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}

export interface SearchHit {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  credibilityScore: string | null;
  signUpEnd: Date | null;
  level: string | null;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 统一搜索入口（护栏2：唯一调用点）
 *
 * MVP 行为：
 *   - 默认 category='competition'、status='published'
 *   - query 非空：tsvector OR ILIKE 双路径召回（中文友好）
 *   - 筛选：level / recognition / suitableGrade(@>) / closingWithinDays
 *   - 排序：relevance（默认）/ credibility / closing
 *   - 真 total：独立 count(*) 查询
 */
export async function searchItems(params: SearchParams): Promise<SearchResult> {
  const {
    query,
    filters,
    sort,
    page = 1,
    pageSize = 20,
  } = params;

  const safePage = Math.max(page, 1);
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);

  const where = buildWhere(query, filters);

  // 真 total（独立查询）
  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(infoItems)
    .leftJoin(competitions, eq(competitions.infoItemId, infoItems.id))
    .where(where);
  const total = totalRow[0]?.count ?? 0;

  const orderBy = buildOrderBy(query, sort);

  const rows = await db
    .select({
      id: infoItems.id,
      title: infoItems.title,
      summary: infoItems.summary,
      category: infoItems.category,
      credibilityScore: infoItems.credibilityScore,
      signUpEnd: competitions.signUpEnd,
      level: competitions.level,
    })
    .from(infoItems)
    .leftJoin(competitions, eq(competitions.infoItemId, infoItems.id))
    .where(where)
    .orderBy(orderBy)
    .limit(safePageSize)
    .offset((safePage - 1) * safePageSize);

  return {
    hits: rows.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      category: r.category,
      credibilityScore: r.credibilityScore,
      signUpEnd: r.signUpEnd,
      level: r.level,
    })),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

/** 构建 WHERE 条件 */
function buildWhere(
  query: string | undefined,
  filters: SearchFilters | undefined,
): SQL {
  // 改动4（Agent B 第 17 条）：默认全类（category undefined 时不拼 WHERE）
  const conditions: SQL[] = [eq(infoItems.status, "published")];
  if (filters?.category) {
    conditions.push(eq(infoItems.category, filters.category));
  }

  const q = query?.trim();
  if (q) {
    // 双路径：tsvector OR ILIKE（中文召回兜底）
    const tsMatch = sql`${infoItems.searchVector} @@ plainto_tsquery('simple', ${q})`;
    const likePattern = `%${q}%`;
    const ilikeMatch = or(
      ilike(infoItems.title, likePattern),
      ilike(infoItems.summary, likePattern),
      sql`coalesce(array_to_string(${infoItems.aliases}, ' '), '') ILIKE ${likePattern}`,
    );
    // or() 可能返回 undefined（空），此处两路径必有值，断言非空
    conditions.push(or(tsMatch, ilikeMatch) as SQL);
  }

  if (filters?.level) {
    conditions.push(eq(competitions.level, filters.level));
  }
  if (filters?.recognition) {
    conditions.push(eq(competitions.recognition, filters.recognition));
  }
  if (filters?.suitableGrade) {
    // suitable_grades @> ARRAY[grade]::text[]
    conditions.push(
      sql`${competitions.suitableGrades} @> ARRAY[${filters.suitableGrade}]::text[]`,
    );
  }
  if (filters?.closingWithinDays && filters.closingWithinDays > 0) {
    // sign_up_end BETWEEN now() AND now() + interval 'N days'
    conditions.push(
      sql`${competitions.signUpEnd} BETWEEN now() AND now() + interval '${sql.raw(String(filters.closingWithinDays))} days'`,
    );
  }

  // conditions 至少含 status + category 两条，and() 必有值
  return and(...conditions) as SQL;
}

/** 构建 ORDER BY */
function buildOrderBy(
  query: string | undefined,
  sort: SearchSort | undefined,
): SQL {
  const by = sort?.by ?? "relevance";
  const q = query?.trim();

  switch (by) {
    case "credibility":
      return sql`${infoItems.credibilityScore} DESC NULLS LAST`;
    case "closing":
      // 即将截止在前（NULL 在后）
      return sql`${competitions.signUpEnd} ASC NULLS LAST`;
    case "relevance":
    default:
      if (!q) {
        // 无搜索词：按可信度降序
        return sql`${infoItems.credibilityScore} DESC NULLS LAST, ${infoItems.lastUpdatedAt} DESC`;
      }
      // 有搜索词：标题精确包含优先 > ts_rank > 可信度
      return sql`
        (CASE WHEN ${infoItems.title} ILIKE ${`%${q}%`} THEN 1 ELSE 0 END) DESC,
        ts_rank(${infoItems.searchVector}, plainto_tsquery('simple', ${q})) DESC,
        ${infoItems.credibilityScore} DESC NULLS LAST
      `;
  }
}
