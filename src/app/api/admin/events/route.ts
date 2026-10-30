import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveDraft, listAdminEvents } from "@/modules/events/service";
import { errorResponse, readBody, sameOrigin } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ events: await listAdminEvents() });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await requireAdmin();
    return NextResponse.json(
      await saveDraft(await readBody(req), user.userId),
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
