/**
 * 查询信息详情（含来源、轮次、经验、竞赛明细）
 * 护栏2：业务查询封装在 lib 模块内，页面/路由只调用
 */
import { eq, and } from "drizzle-orm";

import { db } from "@/db/client";
import {
  infoItems,
  infoSources,
  competitions,
  competitionRounds,
  experiences,
} from "@/db/schema";

export interface CompetitionDetail {
  id: string;
  title: string;
  aliases: string[] | null;
  summary: string | null;
  credibilityScore: string | null;
  lastVerifiedAt: Date | null;
  lastUpdatedAt: Date | null;
  expireAt: Date | null;
  status: string;
  competition: {
    organizer: string | null;
    level: string | null;
    recognition: string | null;
    signUpStart: Date | null;
    signUpEnd: Date | null;
    resultDate: Date | null;
    frequency: string | null;
    validYear: number | null;
    suitableGrades: string[] | null;
    suitableMajors: string[] | null;
    prereq: string | null;
    teamOrSolo: string | null;
    teamSize: string | null;
    difficulty: number | null;
    effortEstimate: string | null;
    valueTags: string[] | null;
    helps: string[] | null;
    officialUrl: string | null;
  } | null;
  sources: {
    id: string;
    sourceType: string;
    authorityWeight: string;
    url: string | null;
    title: string | null;
    isPrimary: boolean;
    collectedAt: Date;
  }[];
  rounds: {
    id: string;
    name: string;
    startAt: Date | null;
    endAt: Date | null;
    sortOrder: number;
  }[];
  experiences: {
    id: string;
    content: string;
    sourceUrl: string | null;
    author: string | null;
    createdAt: Date;
  }[];
}

/**
 * 取单个竞赛详情（仅 published）
 * 护栏2：唯一调用点，页面不直接写 SQL
 */
export async function getCompetitionDetail(
  id: string,
): Promise<CompetitionDetail | null> {
  // 核心信息 + 竞赛明细
  const [row] = await db
    .select({
      id: infoItems.id,
      title: infoItems.title,
      aliases: infoItems.aliases,
      summary: infoItems.summary,
      credibilityScore: infoItems.credibilityScore,
      lastVerifiedAt: infoItems.lastVerifiedAt,
      lastUpdatedAt: infoItems.lastUpdatedAt,
      expireAt: infoItems.expireAt,
      status: infoItems.status,
      // 明细
      organizer: competitions.organizer,
      level: competitions.level,
      recognition: competitions.recognition,
      signUpStart: competitions.signUpStart,
      signUpEnd: competitions.signUpEnd,
      resultDate: competitions.resultDate,
      frequency: competitions.frequency,
      validYear: competitions.validYear,
      suitableGrades: competitions.suitableGrades,
      suitableMajors: competitions.suitableMajors,
      prereq: competitions.prereq,
      teamOrSolo: competitions.teamOrSolo,
      teamSize: competitions.teamSize,
      difficulty: competitions.difficulty,
      effortEstimate: competitions.effortEstimate,
      valueTags: competitions.valueTags,
      helps: competitions.helps,
      officialUrl: competitions.officialUrl,
    })
    .from(infoItems)
    .leftJoin(competitions, eq(competitions.infoItemId, infoItems.id))
    .where(
      and(
        eq(infoItems.id, id),
        eq(infoItems.category, "competition"),
        eq(infoItems.status, "published"),
      ),
    );

  if (!row) return null;

  const competition =
    row.level !== null
      ? {
          organizer: row.organizer,
          level: row.level,
          recognition: row.recognition,
          signUpStart: row.signUpStart,
          signUpEnd: row.signUpEnd,
          resultDate: row.resultDate,
          frequency: row.frequency,
          validYear: row.validYear,
          suitableGrades: row.suitableGrades,
          suitableMajors: row.suitableMajors,
          prereq: row.prereq,
          teamOrSolo: row.teamOrSolo,
          teamSize: row.teamSize,
          difficulty: row.difficulty,
          effortEstimate: row.effortEstimate,
          valueTags: row.valueTags,
          helps: row.helps,
          officialUrl: row.officialUrl,
        }
      : null;

  // 来源（分层展示用）
  const sources = await db
    .select({
      id: infoSources.id,
      sourceType: infoSources.sourceType,
      authorityWeight: infoSources.authorityWeight,
      url: infoSources.url,
      title: infoSources.title,
      isPrimary: infoSources.isPrimary,
      collectedAt: infoSources.collectedAt,
    })
    .from(infoSources)
    .where(eq(infoSources.infoItemId, id));

  // 轮次
  const rounds = await db
    .select({
      id: competitionRounds.id,
      name: competitionRounds.name,
      startAt: competitionRounds.startAt,
      endAt: competitionRounds.endAt,
      sortOrder: competitionRounds.sortOrder,
    })
    .from(competitionRounds)
    .where(eq(competitionRounds.competitionId, id));

  // 学生经验（与官方分层）
  const exps = await db
    .select({
      id: experiences.id,
      content: experiences.content,
      sourceUrl: experiences.sourceUrl,
      author: experiences.author,
      createdAt: experiences.createdAt,
    })
    .from(experiences)
    .where(eq(experiences.infoItemId, id));

  return {
    id: row.id,
    title: row.title,
    aliases: row.aliases,
    summary: row.summary,
    credibilityScore: row.credibilityScore,
    lastVerifiedAt: row.lastVerifiedAt,
    lastUpdatedAt: row.lastUpdatedAt,
    expireAt: row.expireAt,
    status: row.status,
    competition,
    sources: sources.map((s) => ({
      id: s.id,
      sourceType: s.sourceType,
      authorityWeight: s.authorityWeight,
      url: s.url,
      title: s.title,
      isPrimary: s.isPrimary,
      collectedAt: s.collectedAt,
    })),
    rounds: rounds
      .map((r) => ({
        id: r.id,
        name: r.name,
        startAt: r.startAt,
        endAt: r.endAt,
        sortOrder: r.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    experiences: exps.map((e) => ({
      id: e.id,
      content: e.content,
      sourceUrl: e.sourceUrl,
      author: e.author,
      createdAt: e.createdAt,
    })),
  };
}
