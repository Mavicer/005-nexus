import { NextResponse, type NextRequest } from "next/server";
import { queryEvents, publicEventData } from "@/modules/events/service";
import { errorResponse } from "@/lib/http";
export async function GET(req: NextRequest) {
  try {
    const p = Object.fromEntries(
      [...req.nextUrl.searchParams].filter(([, v]) => v !== ""),
    );
    const result = await queryEvents(p);
    return NextResponse.json({
      ...result,
      items: result.items.map(publicEventData),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
