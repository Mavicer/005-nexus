import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { removeFavorite } from "@/lib/favorites";

/** DELETE /api/favorites/:infoItemId */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ infoItemId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { infoItemId } = await params;
  if (!infoItemId) {
    return NextResponse.json({ error: "缺少 infoItemId" }, { status: 400 });
  }
  await removeFavorite(user.userId, infoItemId);
  return NextResponse.json({ ok: true });
}
