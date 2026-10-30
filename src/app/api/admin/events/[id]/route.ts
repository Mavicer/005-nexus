import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  saveDraft,
  getAdminEvent,
  changePublication,
  DomainError,
} from "@/modules/events/service";
import { errorResponse, readBody, sameOrigin, uuidSchema } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Context) {
  try {
    await requireAdmin();
    const row = await getAdminEvent(uuidSchema.parse((await params).id));
    if (!row) throw new DomainError("不存在", 404);
    return NextResponse.json(row);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    sameOrigin(req);
    const u = await requireAdmin(),
      id = uuidSchema.parse((await params).id),
      b = z
        .object({ version: z.number().int().positive(), payload: z.unknown() })
        .parse(await readBody(req));
    return NextResponse.json(
      await saveDraft(b.payload, u.userId, id, b.version),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest, { params }: Context) {
  try {
    sameOrigin(req);
    const u = await requireAdmin(),
      id = uuidSchema.parse((await params).id),
      b = z
        .object({
          version: z.number().int().positive(),
          action: z.enum(["verify", "publish", "withdraw", "flag"]),
          acknowledged: z.boolean().optional(),
        })
        .parse(await readBody(req));
    if (b.action === "verify" && b.acknowledged !== true)
      throw new DomainError("请先确认已逐项核对官方证据");
    return NextResponse.json(
      await changePublication(id, b.version, b.action, u.userId),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
