import { NextResponse, type NextRequest } from "next/server";
import { getPublicEvent, publicEventData } from "@/modules/events/service";
import { errorResponse, uuidSchema } from "@/lib/http";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = uuidSchema.parse((await params).id),
      row = await getPublicEvent(id);
    return row
      ? NextResponse.json({ event: publicEventData(row) })
      : NextResponse.json({ error: "赛事不存在或未公开" }, { status: 404 });
  } catch (e) {
    return errorResponse(e);
  }
}
