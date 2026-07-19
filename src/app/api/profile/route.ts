import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { upsertProfile, type ProfileInput } from "@/lib/profile";
import type { GoalGrade, Goal } from "@/db/schema-enums";

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
  if (body.interests && !Array.isArray(body.interests)) {
    return NextResponse.json({ error: "兴趣需为数组" }, { status: 400 });
  }

  const profile = await upsertProfile(user.userId, body);
  return NextResponse.json({ profile });
}
