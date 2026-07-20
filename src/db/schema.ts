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

/**
 * tsvector 自定义列类型（drizzle 无内置）
 * 用于 info_items.search_vector 中文全文检索
 * MVP：普通 tsvector 列，由应用层（seed/录入）在写入时计算填入
 *      （coalesce/array_to_string 非 immutable，无法用 GENERATED 列）。
 * 切 pg_jieba 时可改回 GENERATED（pg_jieba 的 to_tsvector 可标 immutable）。
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
  "internship",
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

// P4-1：用户画像枚举（owner 授权，最小扩展）
export const goalGradeEnum = pgEnum("goal_grade", [
  "freshman",
  "sophomore",
  "junior",
  "senior",
]);

export const goalEnum = pgEnum("goal", [
  "baoyan",
  "employment",
  "civilService",
  "abroad",
  "entrepreneurship",
]);

// Phase A：画像四维个性化枚举（owner 确认的"加字段不加表"打磨例外）
// schoolTier：把自由文本 school 归一成可计算的学校层次，用于 schoolFit（学校×机会门槛错配）
export const schoolTierEnum = pgEnum("school_tier", [
  "C9",
  "c985",
  "c211",
  "doubleFirst",
  "other",
]);
// majorDirection：把自由文本 major 归一成专业方向，用于 majorMatch（专业×机会价值分流）
// AI 类先做细（5 细分），其余类占位走通用路线（Phase A 不退化）
export const majorDirectionEnum = pgEnum("major_direction", [
  "ai_general",
  "ai_cv",
  "ai_nlp",
  "ai_llm",
  "ai_robotics",
  "cs_general",
  "ee_general",
  "business_general",
  "other",
]);

// Phase A 4.5：培养模式 + 能力画像枚举（owner 授权打磨例外，Agent B 第 50 条放行）
// programMode：培养模式（中外合办4+0 等影响出国通道）
export const programModeEnum = pgEnum("program_mode", [
  "regular",
  "sino_foreign",
  "joint",
  "independent",
]);

// 能力画像 5 枚举（readinessGap 因子用，经验区间非固定分数线）
export const gpaTierEnum = pgEnum("gpa_tier", [
  "top5",
  "top20",
  "top50",
  "below",
]);
export const researchLevelEnum = pgEnum("research_level", [
  "none",
  "project",
  "paper",
]);
// 注：能力画像的竞赛水平用 competition_capability 枚举（与 competition_level 比赛级别区分，避免重名）
export const competitionCapabilityEnum = pgEnum("competition_capability", [
  "none",
  "provincial",
  "national",
]);
export const englishLevelEnum = pgEnum("english_level", [
  "none",
  "cet",
  "ielts_toefl",
]);
export const internshipLevelEnum = pgEnum("internship_level", [
  "none",
  "has",
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
    // expire_at 语义（Agent B 第 6 条澄清）：
    //   MVP seed 中 expire_at = sign_up_end（报名截止），表示该届信息需复审。
    //   后果：报名截止后 freshness 直降 0.1。
    //   年度赛事按 valid_year 分届管理——下届应【新建条目】而非复用旧条目改年份。
    //   避免误把旧届条目改年份复用。
    viewCount: integer("view_count").notNull().default(0),
    // search_vector: generated tsvector（MVP 用 'simple' ts_config）
    // pg_jieba 卡点（Agent B 第 6 条定夺方案 A）：
    //   'simple' 不分词中文，故 search 模块用 ILIKE 兜底中文召回。
    //   切 pg_jieba = 【一次重建 generated column 的 migration】：
    //   DROP search_vector 列 + RECREATE with pg_jieba ts_config + 重建 GIN
    //   + 全表重 tokenize。非零成本；架构上仍平滑（只动 search 模块 + 一个 migration）。
    //   部署环境若已含 pg_jieba 则切 ts_config，否则保持 'simple'。
    //
    // IMMUTABLE 约束：coalesce/array_to_string 不可用于 GENERATED 列（非 immutable），
    // 故首版 search_vector 改用普通 tsvector 列，由应用层（seed/录入）在写入时计算填入。
    // 未来切 pg_jieba 时可改回 GENERATED（pg_jieba 的 to_tsvector 可标 immutable）。
    searchVector: tsvectorType("search_vector"),
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
//    isAdmin：管理员标记（Agent B 第 9 条，第 3 步管理员守卫，唯一新增字段）
//    不引 RBAC/角色系统（P2）
// ============================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    isAdmin: boolean("is_admin").notNull().default(false),
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

// ============================================================
// 8. user_profiles — 用户画像（P4-1，1:1 共享主键，分离认证与资料）
// ============================================================
export const userProfiles = pgTable(
  "user_profiles",
  {
    // userId 即 PK + 外键 cascade（1:1，删 user 级联删 profile）
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    school: text("school"),
    major: text("major"),
    // Phase A：school/major 是自由文本，无法可靠匹配（"南航"/"NUAA" 写法不一）；
    // 加 schoolTier/majorDirection 两枚举把不可比文本归一成可计算的层次与方向，
    // 决策引擎据此查知识库算 schoolFit/majorMatch。可空（onboarding 可跳过）。
    schoolTier: schoolTierEnum("school_tier"),
    majorDirection: majorDirectionEnum("major_direction"),
    // Phase A 4.5：培养模式 + 能力画像（owner 授权打磨例外）
    // isGoAbroad 语义：true=不出国（如4+0中外合办），engine 据此出国通道不加权
    programMode: programModeEnum("program_mode"),
    isGoAbroad: boolean("is_go_abroad"),
    gpaTier: gpaTierEnum("gpa_tier"),
    researchLevel: researchLevelEnum("research_level"),
    competitionCapability: competitionCapabilityEnum("competition_capability"),
    englishLevel: englishLevelEnum("english_level"),
    internshipLevel: internshipLevelEnum("internship_level"),
    grade: goalGradeEnum("grade"),
    goal: goalEnum("goal"),
    interests: text("interests").array(),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
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
  userProfiles,
} as const;
