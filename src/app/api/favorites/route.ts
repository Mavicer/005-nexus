import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { addFavorite, listFavorites } from "@/lib/favorites";

/**
 * POST /api/favorites  body: { infoItemId }
 *   未登录返回 401；infoItem 不存在/未发布返回 404。
 *
 * GET /api/favorites
 *   当前用户收藏列表（按收藏时间倒序）。
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { infoItemId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const infoItemId =
    typeof body.infoItemId === "string" ? body.infoItemId : "";
  if (!infoItemId) {
    return NextResponse.json({ error: "缺少 infoItemId" }, { status: 400 });
  }

  const result = await addFavorite(user.userId, infoItemId);
  if (!result.ok) {
    return NextResponse.json({ error: "信息不存在或未发布" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const items = await listFavorites(user.userId);
  return NextResponse.json({ favorites: items });
}
