/**
 * P1 竞赛 Schema — 最终版（Agent B 第 3 条消息规格，2026-07-18）
 *
 * 设计原则：
 *  1. 共享核心表 info_items（承载分类通用字段）+ 各类明细表（1:1）
 *  2. 来源 info_sources 1:N（多源一致性是可信度模型关键）
 *  3. 学生经验 experiences 单表，与官方信息物理分层（R6 合规）
 *  4. credibility_score 存为列（搜索排序用），服务层写入时计算，不用 DB 触发器
 *  5. 搜索用 search_vector（tsvector + pg_jieba + GIN）；筛选用 btree/数组索引
 *  6. MVP 用户最小化：users + favorites（浏览历史推迟 P2）
 *
 * 护栏（Agent B 第 5 条）：
 *  - credibility_score 是「评分体系」非「真实性判断」
 *  - 可信度公式预留第 4 项 feedback 扩展位（MVP 不实现）
 *  - status=pending 即人工审核入口（MVP 不建审核界面，放 P2）
 *
 * 注意：search_vector 的 GENERATED COLUMN 依赖 pg_jieba；
 *      若 pg_jieba 不可用，需在 migration 层降级（见 drizzle/0001）。
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  pgEnum,
  smallint,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * tsvector 自定义列类型（drizzle 无内置）
 * 用于 info_items.search_vector 中文全文检索
 * generated column 与具体 ts_config（pg_jieba / simple）由 migration SQL 最终确定
 */
const tsvectorType = customType<{ data: unknown }>({
  dataType() {
    return "tsvector";
  },
});

// ============================================================
// 枚举（pgEnum）
// ============================================================

export const infoCategoryEnum = pgEnum("info_category", [
  "competition",
  "research",
  "exam",
  "scholarship",
  "baoyan",
  "opportunity",
]);

export const applicableScopeTypeEnum = pgEnum("applicable_scope_type", [
  "national",
  "province",
  "school",
]);

export const infoStatusEnum = pgEnum("info_status", [
  "draft",
  "pending",
  "published",
  "archived",
  "removed",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "official_doc",
  "inst_notice",
  "authority_list",
  "student_exp",
  "community",
  "official_site",
]);

export const competitionLevelEnum = pgEnum("competition_level", [
  "school",
  "provincial",
  "national",
  "international",
]);

export const competitionRecognitionEnum = pgEnum("competition_recognition", [
  "official_A",
  "leaderboard_listed",
  "normal",
]);

export const competitionFrequencyEnum = pgEnum("competition_frequency", [
  "annual",
  "biennial",
  "irregular",
  "once",
]);

export const teamOrSoloEnum = pgEnum("team_or_solo", [
  "team",
  "solo",
  "both",
]);

// ============================================================
// 1. info_items — 信息共享核心表
// ============================================================
export const infoItems = pgTable(
  "info_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: infoCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    aliases: text("aliases").array(),
    summary: text("summary"),
    applicableScopeType: applicableScopeTypeEnum("applicable_scope_type")
      .notNull()
      .default("national"),
    applicableScopeValue: text("applicable_scope_value"),
    status: infoStatusEnum("status").notNull().default("draft"),
    credibilityScore: numeric("credibility_score", { precision: 3, scale: 2 }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expireAt: timestamp("expire_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    // search_vector: generated tsvector（pg_jieba 中文分词）
    // 依赖扩展可用性；若降级 pg_trgm，migration 层会调整此处定义
    // ts_config 名（pg_jieba 的 'chinese_zh' 或兜底 'simple'）由 migration 确认扩展后写入。
    // Drizzle 此处用 generatedAlwaysAs + sql 表达式生成 STORED 列。
    searchVector: tsvectorType("search_vector").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(array_to_string(aliases, ' '), '') || ' ' || coalesce(summary, ''))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [
    index("info_items_search_vector_idx").using("gin", t.searchVector),
    index("info_items_category_status_idx").on(t.category, t.status),
    index("info_items_scope_type_idx").on(t.applicableScopeType),
    index("info_items_expire_at_idx").on(t.expireAt),
  ],
);

// ============================================================
// 2. info_sources — 来源（N:1）
// ============================================================
export const infoSources = pgTable(
  "info_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    infoItemId: uuid("info_item_id")
      .notNull()
      .references(() => infoItems.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    authorityWeight: numeric("authority_weight", { precision: 2, scale: 1 }).notNull(),
    url: text("url"),
    title: text("title"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    isPrimary: boolean("is_primary").notNull().default(false),
    collectedAt: timestamp("collected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("info_sources_info_item_id_idx").on(t.infoItemId)],
);

// ============================================================
// 3. competitions — 竞赛明细（1:1，共享主键）
// ============================================================
export const competitions = pgTable(
  "competitions",
  {
    infoItemId: uuid("info_item_id")
      .primaryKey()
      .references(() => infoItems.id, { onDelete: "cascade" }),
    organizer: text("organizer"),
    level: competitionLevelEnum("level").notNull(),
    recognition: competitionRecognitionEnum("recognition")
      .notNull()
      .default("normal"),
    signUpStart: timestamp("sign_up_start", { withTimezone: true }),
    signUpEnd: timestamp("sign_up_end", { withTimezone: true }),
    resultDate: timestamp("result_date", { withTimezone: true }),
    frequency: competitionFrequencyEnum("frequency").notNull().default("annual"),
    validYear: integer("valid_year"),
    suitableGrades: text("suitable_grades").array(),
    suitableMajors: text("suitable_majors").array(),
    prereq: text("prereq"),
    teamOrSolo: teamOrSoloEnum("team_or_solo").notNull().default("both"),
    teamSize: text("team_size"),
    difficulty: smallint("difficulty").notNull().default(3),
    effortEstimate: text("effort_estimate"),
    valueTags: text("value_tags").array(),
    helps: text("helps").array(),
    officialUrl: text("official_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("competitions_level_idx").on(t.level),
    index("competitions_recognition_idx").on(t.recognition),
    index("competitions_suitable_grades_idx").using("gin", t.suitableGrades),
    index("competitions_suitable_majors_idx").using("gin", t.suitableMajors),
    index("competitions_sign_up_end_idx").on(t.signUpEnd),
    index("competitions_valid_year_idx").on(t.validYear),
  ],
);

// ============================================================
// 4. competition_rounds — 轮次（N:1）
// ============================================================
export const competitionRounds = pgTable(
  "competition_rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.infoItemId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("competition_rounds_comp_sort_idx").on(t.competitionId, t.sortOrder)],
);

// ============================================================
// 5. experiences — 学生经验（N:1，与官方分层）
// ============================================================
export const experiences = pgTable(
  "experiences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    infoItemId: uuid("info_item_id")
      .notNull()
      .references(() => infoItems.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sourceUrl: text("source_url"),
    author: text("author"),
    authorityWeight: numeric("authority_weight", { precision: 2, scale: 1 })
      .notNull()
      .default("0.4"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("experiences_info_item_id_idx").on(t.infoItemId)],
);

// ============================================================
// 6. users — MVP 邮箱注册
//    密码哈希：argon2id（理由见 AGENT_COMMUNICATION.md Developer Update）
// ============================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// ============================================================
// 7. favorites — 收藏
// ============================================================
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    infoItemId: uuid("info_item_id")
      .notNull()
      .references(() => infoItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("favorites_user_item_idx").on(t.userId, t.infoItemId),
  ],
);

// 导出表对象集合
export const tables = {
  infoItems,
  infoSources,
  competitions,
  competitionRounds,
  experiences,
  users,
  favorites,
} as const;
