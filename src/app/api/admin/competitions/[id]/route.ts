import { type NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  updateCompetition,
  publishCompetition,
  archiveCompetition,
  type CompetitionInput,
} from "@/lib/admin/competitions";

/** GET 不在此实现（详情走公开 getInfoDetail 或后续补管理员视图） */

/** PATCH /api/admin/competitions/:id — 更新 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return toAuthError(e);
  }
  const { id } = await params;

  let body: Partial<CompetitionInput>;
  try {
    body = (await req.json()) as Partial<CompetitionInput>;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  await updateCompetition(id, body);
  return NextResponse.json({ ok: true });
}

/** POST /api/admin/competitions/:id?action=publish|archive — 发布/下架 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return toAuthError(e);
  }
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");

  if (action === "publish") {
    await publishCompetition(id);
    return NextResponse.json({ ok: true, status: "published" });
  }
  if (action === "archive") {
    await archiveCompetition(id);
    return NextResponse.json({ ok: true, status: "archived" });
  }
  return NextResponse.json({ error: "未知 action" }, { status: 400 });
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
