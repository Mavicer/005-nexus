/**
 * 用户画像（P4-1）
 * upsertProfile / getProfile / needsOnboarding
 * 护栏：1:1 共享主键（userId），分离认证与资料
 */
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import type {
  GoalGrade,
  Goal,
  SchoolTier,
  MajorDirection,
  ProgramMode,
  GpaTier,
  ResearchLevel,
  CompetitionCapability,
  EnglishLevel,
  InternshipLevel,
} from "@/db/schema-enums";

export interface ProfileInput {
  school?: string | null;
  major?: string | null;
  schoolTier?: SchoolTier | null;
  majorDirection?: MajorDirection | null;
  programMode?: ProgramMode | null;
  isGoAbroad?: boolean | null;
  gpaTier?: GpaTier | null;
  researchLevel?: ResearchLevel | null;
  competitionCapability?: CompetitionCapability | null;
  englishLevel?: EnglishLevel | null;
  internshipLevel?: InternshipLevel | null;
  grade?: GoalGrade | null;
  goal?: Goal | null;
  interests?: string[] | null;
  onboardingCompleted?: boolean;
}

export interface Profile {
  userId: string;
  school: string | null;
  major: string | null;
  schoolTier: SchoolTier | null;
  majorDirection: MajorDirection | null;
  programMode: ProgramMode | null;
  isGoAbroad: boolean | null;
  gpaTier: GpaTier | null;
  researchLevel: ResearchLevel | null;
  competitionCapability: CompetitionCapability | null;
  englishLevel: EnglishLevel | null;
  internshipLevel: InternshipLevel | null;
  grade: GoalGrade | null;
  goal: Goal | null;
  interests: string[] | null;
  onboardingCompleted: boolean;
}

/** 取用户画像（无则 null） */
export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    userId: row.userId,
    school: row.school,
    major: row.major,
    schoolTier: row.schoolTier,
    majorDirection: row.majorDirection,
    programMode: row.programMode,
    isGoAbroad: row.isGoAbroad,
    gpaTier: row.gpaTier,
    researchLevel: row.researchLevel,
    competitionCapability: row.competitionCapability,
    englishLevel: row.englishLevel,
    internshipLevel: row.internshipLevel,
    grade: row.grade,
    goal: row.goal,
    interests: row.interests,
    onboardingCompleted: row.onboardingCompleted,
  };
}

/** upsert 画像（userId 即 PK，onConflict 更新） */
export async function upsertProfile(
  userId: string,
  input: ProfileInput,
): Promise<Profile> {
  const [row] = await db
    .insert(userProfiles)
    .values({
      userId,
      school: input.school ?? null,
      major: input.major ?? null,
      schoolTier: input.schoolTier ?? null,
      majorDirection: input.majorDirection ?? null,
      programMode: input.programMode ?? null,
      isGoAbroad: input.isGoAbroad ?? null,
      gpaTier: input.gpaTier ?? null,
      researchLevel: input.researchLevel ?? null,
      competitionCapability: input.competitionCapability ?? null,
      englishLevel: input.englishLevel ?? null,
      internshipLevel: input.internshipLevel ?? null,
      grade: input.grade ?? null,
      goal: input.goal ?? null,
      interests: input.interests ?? null,
      onboardingCompleted: input.onboardingCompleted ?? false,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        school: input.school ?? null,
        major: input.major ?? null,
        schoolTier: input.schoolTier ?? null,
        majorDirection: input.majorDirection ?? null,
        programMode: input.programMode ?? null,
        isGoAbroad: input.isGoAbroad ?? null,
        gpaTier: input.gpaTier ?? null,
        researchLevel: input.researchLevel ?? null,
        competitionCapability: input.competitionCapability ?? null,
        englishLevel: input.englishLevel ?? null,
        internshipLevel: input.internshipLevel ?? null,
        grade: input.grade ?? null,
        goal: input.goal ?? null,
        interests: input.interests ?? null,
        ...(input.onboardingCompleted !== undefined && {
          onboardingCompleted: input.onboardingCompleted,
        }),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) throw new Error("upsert profile 失败");
  return {
    userId: row.userId,
    school: row.school,
    major: row.major,
    schoolTier: row.schoolTier,
    majorDirection: row.majorDirection,
    programMode: row.programMode,
    isGoAbroad: row.isGoAbroad,
    gpaTier: row.gpaTier,
    researchLevel: row.researchLevel,
    competitionCapability: row.competitionCapability,
    englishLevel: row.englishLevel,
    internshipLevel: row.internshipLevel,
    grade: row.grade,
    goal: row.goal,
    interests: row.interests,
    onboardingCompleted: row.onboardingCompleted,
  };
}

/** 是否需要 onboarding（无 profile 或未完成） */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return !profile?.onboardingCompleted;
}
