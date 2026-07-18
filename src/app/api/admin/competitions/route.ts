import { type NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  createCompetition,
  listAdminCompetitions,
  type CompetitionInput,
} from "@/lib/admin/competitions";

/** GET /api/admin/competitions?status=draft|published|archived|all */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return toAuthError(e);
  }
  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const items = await listAdminCompetitions(status);
  return NextResponse.json({ items });
}

/** POST /api/admin/competitions — 创建（status=draft） */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAdmin();
  } catch (e) {
    return toAuthError(e);
  }

  let body: CompetitionInput;
  try {
    body = (await req.json()) as CompetitionInput;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (!body.title || !body.level) {
    return NextResponse.json({ error: "缺少必填字段 title/level" }, { status: 400 });
  }

  const { id } = await createCompetition(body, user.userId);
  return NextResponse.json({ id }, { status: 201 });
}

function toAuthError(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  return NextResponse.json({ error: "认证失败" }, { status: 401 });
}
