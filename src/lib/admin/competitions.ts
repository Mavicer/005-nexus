/**
 * 管理员录入业务（护栏2/3：业务封装在此，admin 路由薄调用）
 *
 * 录入流程（Agent B 第 9 条第 2 节）：
 *   draft → published（MVP 录入者即管理员，无 UGC，故无 pending）
 *   - 录入 → status=draft（搜索不可见，搜索过滤 published）
 *   - 发布 → draft→published（进搜索/详情页）
 *   - 下架 → published→archived
 *   - pending 预留 P2（UGC 提交后待审）
 *   护栏3「人工审核入口」= 管理员的"发布"动作本身。
 *
 * search_vector 应用层写入（to_tsvector('simple', ...)）；
 * credibility_score 用 computeCredibilityScore() 计算（复用 lib，不手算）。
 */
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  infoItems,
  infoSources,
  competitions,
  competitionRounds,
  experiences,
} from "@/db/schema";
import { computeCredibilityScore } from "@/lib/credibility";
import { SOURCE_AUTHORITY_WEIGHT, type SourceType } from "@/lib/source-weights";
import type { InfoCategory } from "@/db/schema-enums";

// ---------- 输入类型 ----------

export interface SourceInput {
  sourceType: SourceType;
  url?: string;
  title?: string;
  isPrimary?: boolean;
}

export interface RoundInput {
  name: string;
  startAt?: string;
  endAt?: string;
  sortOrder?: number;
}

export interface ExperienceInput {
  content: string;
  author?: string;
  sourceUrl?: string;
}

export interface CompetitionInput {
  // info_items
  title: string;
  category?: InfoCategory;
  aliases?: string[];
  summary?: string;
  applicableScopeType?: "national" | "province" | "school";
  applicableScopeValue?: string;
  expireAt?: string;
  lastVerifiedAt?: string;
  // competitions（非竞赛数据 level 等字段允许空，owner 裁定通用承载表）
  organizer?: string;
  level?: "school" | "provincial" | "national" | "international";
  recognition?: "official_A" | "leaderboard_listed" | "normal";
  signUpStart?: string;
  signUpEnd?: string;
  resultDate?: string;
  frequency?: "annual" | "biennial" | "irregular" | "once";
  validYear?: number;
  suitableGrades?: string[];
  suitableMajors?: string[];
  prereq?: string;
  teamOrSolo?: "team" | "solo" | "both";
  teamSize?: string;
  difficulty?: number;
  effortEstimate?: string;
  valueTags?: string[];
  helps?: string[];
  officialUrl?: string;
  // 子表
  sources?: SourceInput[];
  rounds?: RoundInput[];
  experiences?: ExperienceInput[];
}

// ---------- 创建 ----------

export async function createCompetition(
  input: CompetitionInput,
  createdBy: string,
): Promise<{ id: string }> {
  const searchVectorText = [input.title, ...(input.aliases ?? []), input.summary]
    .filter(Boolean)
    .join(" ");

  // 1. info_items（status=draft）
  // 改动5（Agent B 第 17 条）：category 从入参传（默认 competition），competitions 表作通用承载表
  const [item] = await db
    .insert(infoItems)
    .values({
      category: input.category ?? "competition",
      title: input.title,
      aliases: input.aliases,
      summary: input.summary,
      status: "draft",
      applicableScopeType: input.applicableScopeType ?? "national",
      applicableScopeValue: input.applicableScopeValue,
      expireAt: input.expireAt ? new Date(input.expireAt) : null,
      lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : new Date(),
      searchVector: sql`to_tsvector('simple', ${searchVectorText})`,
      createdBy,
    })
    .returning({ id: infoItems.id });

  if (!item) throw new Error("创建 info_item 失败");

  // 2. competitions 明细（level 非竞赛可空）
  await db.insert(competitions).values({
    infoItemId: item.id,
    organizer: input.organizer,
    level: input.level ?? "national",
    recognition: input.recognition ?? "normal",
    signUpStart: input.signUpStart ? new Date(input.signUpStart) : null,
    signUpEnd: input.signUpEnd ? new Date(input.signUpEnd) : null,
    resultDate: input.resultDate ? new Date(input.resultDate) : null,
    frequency: input.frequency ?? "annual",
    validYear: input.validYear,
    suitableGrades: input.suitableGrades,
    suitableMajors: input.suitableMajors,
    prereq: input.prereq,
    teamOrSolo: input.teamOrSolo ?? "both",
    teamSize: input.teamSize,
    difficulty: input.difficulty ?? 3,
    effortEstimate: input.effortEstimate,
    valueTags: input.valueTags,
    helps: input.helps,
    officialUrl: input.officialUrl,
  });

  // 3. sources + 可信度计算
  await writeSources(item.id, input.sources ?? []);

  // 4. rounds
  if (input.rounds?.length) {
    await db.insert(competitionRounds).values(
      input.rounds.map((r) => ({
        competitionId: item.id,
        name: r.name,
        startAt: r.startAt ? new Date(r.startAt) : null,
        endAt: r.endAt ? new Date(r.endAt) : null,
        sortOrder: r.sortOrder ?? 0,
      })),
    );
  }

  // 5. experiences
  if (input.experiences?.length) {
    await db.insert(experiences).values(
      input.experiences.map((e) => ({
        infoItemId: item.id,
        content: e.content,
        author: e.author,
        sourceUrl: e.sourceUrl,
      })),
    );
  }

  // 6. credibility_score（服务层计算，写入）
  await recalcCredibility(item.id, input.expireAt, input.lastVerifiedAt);

  return { id: item.id };
}

// ---------- 更新 ----------
// MVP 简化：更新仅改 competitions/info_items 标量字段；
// sources/rounds/experiences 的更新走「先删后建」(replace)。

export async function updateCompetition(
  id: string,
  input: Partial<CompetitionInput>,
): Promise<void> {
  const searchVectorText = [input.title, ...(input.aliases ?? []), input.summary]
    .filter(Boolean)
    .join(" ");

  // info_items
  await db
    .update(infoItems)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.aliases !== undefined && { aliases: input.aliases }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.applicableScopeType !== undefined && {
        applicableScopeType: input.applicableScopeType,
      }),
      ...(input.applicableScopeValue !== undefined && {
        applicableScopeValue: input.applicableScopeValue,
      }),
      ...(input.expireAt !== undefined && {
        expireAt: input.expireAt ? new Date(input.expireAt) : null,
      }),
      ...(input.lastVerifiedAt !== undefined && {
        lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null,
      }),
      lastUpdatedAt: new Date(),
      ...(searchVectorText && {
        searchVector: sql`to_tsvector('simple', ${searchVectorText})`,
      }),
    })
    .where(eq(infoItems.id, id));

  // competitions
  await db
    .update(competitions)
    .set({
      ...(input.organizer !== undefined && { organizer: input.organizer }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.recognition !== undefined && { recognition: input.recognition }),
      ...(input.signUpStart !== undefined && {
        signUpStart: input.signUpStart ? new Date(input.signUpStart) : null,
      }),
      ...(input.signUpEnd !== undefined && {
        signUpEnd: input.signUpEnd ? new Date(input.signUpEnd) : null,
      }),
      ...(input.resultDate !== undefined && {
        resultDate: input.resultDate ? new Date(input.resultDate) : null,
      }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.validYear !== undefined && { validYear: input.validYear }),
      ...(input.suitableGrades !== undefined && { suitableGrades: input.suitableGrades }),
      ...(input.suitableMajors !== undefined && { suitableMajors: input.suitableMajors }),
      ...(input.prereq !== undefined && { prereq: input.prereq }),
      ...(input.teamOrSolo !== undefined && { teamOrSolo: input.teamOrSolo }),
      ...(input.teamSize !== undefined && { teamSize: input.teamSize }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
      ...(input.effortEstimate !== undefined && { effortEstimate: input.effortEstimate }),
      ...(input.valueTags !== undefined && { valueTags: input.valueTags }),
      ...(input.helps !== undefined && { helps: input.helps }),
      ...(input.officialUrl !== undefined && { officialUrl: input.officialUrl }),
      updatedAt: new Date(),
    })
    .where(eq(competitions.infoItemId, id));

  // 子表 replace（若提供则先删后建）
  if (input.sources !== undefined) {
    await db.delete(infoSources).where(eq(infoSources.infoItemId, id));
    await writeSources(id, input.sources);
  }
  if (input.rounds !== undefined) {
    await db.delete(competitionRounds).where(eq(competitionRounds.competitionId, id));
    if (input.rounds.length) {
      await db.insert(competitionRounds).values(
        input.rounds.map((r) => ({
          competitionId: id,
          name: r.name,
          startAt: r.startAt ? new Date(r.startAt) : null,
          endAt: r.endAt ? new Date(r.endAt) : null,
          sortOrder: r.sortOrder ?? 0,
        })),
      );
    }
  }
  if (input.experiences !== undefined) {
    await db.delete(experiences).where(eq(experiences.infoItemId, id));
    if (input.experiences.length) {
      await db.insert(experiences).values(
        input.experiences.map((e) => ({
          infoItemId: id,
          content: e.content,
          author: e.author,
          sourceUrl: e.sourceUrl,
        })),
      );
    }
  }

  // 重算可信度
  await recalcCredibility(id, input.expireAt, input.lastVerifiedAt);
}

// ---------- 状态变更 ----------

export async function publishCompetition(id: string): Promise<void> {
  await db
    .update(infoItems)
    .set({ status: "published", lastUpdatedAt: new Date() })
    .where(eq(infoItems.id, id));
}

export async function archiveCompetition(id: string): Promise<void> {
  await db
    .update(infoItems)
    .set({ status: "archived", lastUpdatedAt: new Date() })
    .where(eq(infoItems.id, id));
}

// ---------- 列表 ----------

export interface AdminListItem {
  id: string;
  title: string;
  status: string;
  level: string | null;
  signUpEnd: Date | null;
  credibilityScore: string | null;
  updatedAt: Date | null;
}

export async function listAdminCompetitions(
  statusFilter?: string,
): Promise<AdminListItem[]> {
  const conditions = [eq(infoItems.category, "competition")];
  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(infoItems.status, statusFilter as typeof infoItems.status.enumValues[number]));
  }
  const where = and(...conditions);

  const rows = await db
    .select({
      id: infoItems.id,
      title: infoItems.title,
      status: infoItems.status,
      level: competitions.level,
      signUpEnd: competitions.signUpEnd,
      credibilityScore: infoItems.credibilityScore,
      updatedAt: infoItems.updatedAt,
    })
    .from(infoItems)
    .leftJoin(competitions, eq(competitions.infoItemId, infoItems.id))
    .where(where)
    .orderBy(desc(infoItems.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    level: r.level,
    signUpEnd: r.signUpEnd,
    credibilityScore: r.credibilityScore,
    updatedAt: r.updatedAt,
  }));
}

// ---------- 内部工具 ----------

async function writeSources(infoItemId: string, sources: SourceInput[]): Promise<void> {
  if (!sources.length) return;
  await db.insert(infoSources).values(
    sources.map((s) => ({
      infoItemId,
      sourceType: s.sourceType,
      authorityWeight: SOURCE_AUTHORITY_WEIGHT[s.sourceType].toString(),
      url: s.url,
      title: s.title,
      isPrimary: s.isPrimary ?? false,
      archivedAt: new Date(),
    })),
  );
}

async function recalcCredibility(
  infoItemId: string,
  expireAt?: string,
  lastVerifiedAt?: string,
): Promise<void> {
  const sources = await db
    .select({
      sourceType: infoSources.sourceType,
      authorityWeight: infoSources.authorityWeight,
    })
    .from(infoSources)
    .where(eq(infoSources.infoItemId, infoItemId));

  const score = computeCredibilityScore({
    sources: sources.map((s) => ({
      sourceType: s.sourceType,
      authorityWeight: Number(s.authorityWeight),
    })),
    lastVerifiedAt: lastVerifiedAt ? new Date(lastVerifiedAt) : new Date(),
    expireAt: expireAt ? new Date(expireAt) : null,
  });

  await db
    .update(infoItems)
    .set({ credibilityScore: score.toFixed(2) })
    .where(eq(infoItems.id, infoItemId));
}
