/**
 * 管理员读取单条竞赛用于编辑（含 sources/rounds/experiences）
 * 护栏2：业务封装，admin 页面薄调用
 */
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  infoItems,
  infoSources,
  competitions,
  competitionRounds,
  experiences,
} from "@/db/schema";
import type { CompetitionInput } from "./competitions";

export async function getCompetitionForEdit(
  id: string,
): Promise<CompetitionInput | null> {
  const [base] = await db
    .select()
    .from(infoItems)
    .leftJoin(competitions, eq(competitions.infoItemId, infoItems.id))
    .where(eq(infoItems.id, id))
    .limit(1);
  if (!base) return null;

  const c = base.competitions;
  const sources = await db
    .select()
    .from(infoSources)
    .where(eq(infoSources.infoItemId, id));
  const rounds = await db
    .select()
    .from(competitionRounds)
    .where(eq(competitionRounds.competitionId, id));
  const exps = await db
    .select()
    .from(experiences)
    .where(eq(experiences.infoItemId, id));

  return {
    title: base.info_items.title,
    category: base.info_items.category ?? undefined,
    aliases: base.info_items.aliases ?? [],
    summary: base.info_items.summary ?? "",
    applicableScopeType: base.info_items.applicableScopeType,
    applicableScopeValue: base.info_items.applicableScopeValue ?? undefined,
    expireAt: base.info_items.expireAt?.toISOString(),
    lastVerifiedAt: base.info_items.lastVerifiedAt?.toISOString(),
    organizer: c?.organizer ?? undefined,
    level: c?.level ?? undefined,
    recognition: c?.recognition,
    signUpStart: c?.signUpStart?.toISOString(),
    signUpEnd: c?.signUpEnd?.toISOString(),
    resultDate: c?.resultDate?.toISOString(),
    frequency: c?.frequency,
    validYear: c?.validYear ?? undefined,
    suitableGrades: c?.suitableGrades ?? [],
    suitableMajors: c?.suitableMajors ?? [],
    prereq: c?.prereq ?? undefined,
    teamOrSolo: c?.teamOrSolo,
    teamSize: c?.teamSize ?? undefined,
    difficulty: c?.difficulty ?? 3,
    effortEstimate: c?.effortEstimate ?? undefined,
    valueTags: c?.valueTags ?? [],
    helps: c?.helps ?? [],
    officialUrl: c?.officialUrl ?? undefined,
    sources: sources.map((s) => ({
      sourceType: s.sourceType,
      url: s.url ?? undefined,
      title: s.title ?? undefined,
      isPrimary: s.isPrimary,
    })),
    rounds: rounds.map((r) => ({
      name: r.name,
      startAt: r.startAt?.toISOString(),
      endAt: r.endAt?.toISOString(),
      sortOrder: r.sortOrder,
    })),
    experiences: exps.map((e) => ({
      content: e.content,
      author: e.author ?? undefined,
      sourceUrl: e.sourceUrl ?? undefined,
    })),
  };
}
