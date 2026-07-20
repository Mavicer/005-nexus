import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { upsertProfile, type ProfileInput } from "@/lib/profile";
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

const VALID_GRADES: GoalGrade[] = [
  "freshman",
  "sophomore",
  "junior",
  "senior",
];
const VALID_GOALS: Goal[] = [
  "baoyan",
  "employment",
  "civilService",
  "abroad",
  "entrepreneurship",
];
const VALID_SCHOOL_TIERS: SchoolTier[] = [
  "C9",
  "c985",
  "c211",
  "doubleFirst",
  "other",
];
const VALID_MAJOR_DIRECTIONS: MajorDirection[] = [
  "ai_general",
  "ai_cv",
  "ai_nlp",
  "ai_llm",
  "ai_robotics",
  "cs_general",
  "ee_general",
  "business_general",
  "other",
];
const VALID_PROGRAM_MODES: ProgramMode[] = [
  "regular",
  "sino_foreign",
  "joint",
  "independent",
];
const VALID_GPA_TIERS: GpaTier[] = ["top5", "top20", "top50", "below"];
const VALID_RESEARCH_LEVELS: ResearchLevel[] = ["none", "project", "paper"];
const VALID_COMPETITION_LEVELS: CompetitionCapability[] = [
  "none",
  "provincial",
  "national",
];
const VALID_ENGLISH_LEVELS: EnglishLevel[] = ["none", "cet", "ielts_toefl"];
const VALID_INTERNSHIP_LEVELS: InternshipLevel[] = ["none", "has"];

/**
 * POST /api/profile — upsert 用户画像（登录守卫）
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: ProfileInput;
  try {
    body = (await req.json()) as ProfileInput;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // 校验枚举
  if (body.grade && !VALID_GRADES.includes(body.grade)) {
    return NextResponse.json({ error: "无效年级" }, { status: 400 });
  }
  if (body.goal && !VALID_GOALS.includes(body.goal)) {
    return NextResponse.json({ error: "无效目标" }, { status: 400 });
  }
  if (body.schoolTier && !VALID_SCHOOL_TIERS.includes(body.schoolTier)) {
    return NextResponse.json({ error: "无效学校层次" }, { status: 400 });
  }
  if (
    body.majorDirection &&
    !VALID_MAJOR_DIRECTIONS.includes(body.majorDirection)
  ) {
    return NextResponse.json({ error: "无效专业方向" }, { status: 400 });
  }
  if (body.programMode && !VALID_PROGRAM_MODES.includes(body.programMode)) {
    return NextResponse.json({ error: "无效培养模式" }, { status: 400 });
  }
  if (body.isGoAbroad !== null && body.isGoAbroad !== undefined && typeof body.isGoAbroad !== "boolean") {
    return NextResponse.json({ error: "isGoAbroad 需为布尔值" }, { status: 400 });
  }
  if (body.gpaTier && !VALID_GPA_TIERS.includes(body.gpaTier)) {
    return NextResponse.json({ error: "无效 GPA 档位" }, { status: 400 });
  }
  if (body.researchLevel && !VALID_RESEARCH_LEVELS.includes(body.researchLevel)) {
    return NextResponse.json({ error: "无效科研水平" }, { status: 400 });
  }
  if (
    body.competitionCapability &&
    !VALID_COMPETITION_LEVELS.includes(body.competitionCapability)
  ) {
    return NextResponse.json({ error: "无效竞赛水平" }, { status: 400 });
  }
  if (body.englishLevel && !VALID_ENGLISH_LEVELS.includes(body.englishLevel)) {
    return NextResponse.json({ error: "无效英语水平" }, { status: 400 });
  }
  if (
    body.internshipLevel &&
    !VALID_INTERNSHIP_LEVELS.includes(body.internshipLevel)
  ) {
    return NextResponse.json({ error: "无效实习水平" }, { status: 400 });
  }
  if (body.interests && !Array.isArray(body.interests)) {
    return NextResponse.json({ error: "兴趣需为数组" }, { status: 400 });
  }

  const profile = await upsertProfile(user.userId, body);
  return NextResponse.json({ profile });
}
