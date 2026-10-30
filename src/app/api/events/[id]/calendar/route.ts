import { type NextRequest } from "next/server";
import { getPublicEvent, DomainError } from "@/modules/events/service";
import { buildCalendar } from "@/modules/events/calendar";
import { errorResponse, uuidSchema } from "@/lib/http";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const row = await getPublicEvent(uuidSchema.parse((await params).id));
    if (!row) throw new DomainError("赛事不存在或未公开", 404);
    let data;
    try {
      data = buildCalendar(
        row.id,
        row.publishedData,
        row.publishedVersion!,
        req.nextUrl.searchParams.get("milestone") ?? undefined,
      );
    } catch {
      throw new DomainError("此赛事没有可精确导出的时间，请查看官方原文", 422);
    }
    return new Response(data, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${row.slug}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
