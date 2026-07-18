/**
 * 搜索模块（护栏2 — Agent B 第 5 条）
 *
 * 搜索逻辑封装在本单一模块，上层 API/页面只调 searchItems()，不直接写 SQL。
 * 将来换 Meilisearch 只改本模块，不动调用方。
 *
 * MVP 实现：PostgreSQL 中文全文检索（tsvector + GIN）
 *   - ts_config 当前用 'simple'（pg_jieba 不可用的兜底）
 *   - 部署到含 pg_jieba 镜像后切换为 pg_jieba 配置
 */
import { sql, and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { infoItems, competitions } from "@/db/schema";
import type { InfoCategory } from "@/db/schema-enums";

export interface SearchFilters {
  category?: InfoCategory;
  level?: "school" | "provincial" | "national" | "international";
  recognition?: "official_A" | "leaderboard_listed" | "normal";
  suitableGrade?: string;
  /** 即将截止：返回 N 天内截止的，null=不限 */
  closingWithinDays?: number;
}

export interface SearchSort {
  // 默认按相关度 + 可信度
  by: "relevance" | "credibility" | "closing";
}

export interface SearchParams {
  query: string;
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

/**
 * 统一搜索入口（护栏2：唯一调用点）
 * MVP 先实现骨架：仅返回 published 竞赛 + 全文匹配 + 基础筛选。
 * 详细 ts_rank / 复合排序将在 P1 后续填充。
 */
export async function searchItems(params: SearchParams): Promise<{
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { query, filters, sort, page = 1, pageSize = 20 } = params;
  void sort; // MVP 后续支持
  void filters;

  const conditions = [
    eq(infoItems.status, "published"),
    eq(infoItems.category, "competition"),
  ];
  if (query.trim()) {
    conditions.push(
      sql`${infoItems.searchVector} @@ plainto_tsquery('simple', ${query})`,
    );
  }
  const where = and(...conditions);

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
    .orderBy(sql`ts_rank(${infoItems.searchVector}, plainto_tsquery('simple', ${query})) DESC`)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

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
    total: rows.length,
    page,
    pageSize,
  };
}
