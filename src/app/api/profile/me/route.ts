import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

/**
 * GET /api/profile/me — 当前用户画像 + needsOnboarding
 * 供前端登录后判断跳 /onboarding 还是 next/dashboard
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const profile = await getProfile(user.userId);
  return NextResponse.json({
    profile,
    needsOnboarding: !profile?.onboardingCompleted,
  });
}
