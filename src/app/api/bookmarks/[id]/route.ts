import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { addBookmark, removeBookmark } from "@/modules/bookmarks/service";
import { errorResponse, sameOrigin, uuidSchema } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: Context) {
  try {
    sameOrigin(req);
    const u = await requireUser();
    await addBookmark(u.userId, uuidSchema.parse((await params).id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    sameOrigin(req);
    const u = await requireUser();
    await removeBookmark(u.userId, uuidSchema.parse((await params).id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
