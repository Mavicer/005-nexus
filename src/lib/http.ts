import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { DomainError } from "@/modules/events/service";
export const uuidSchema = z.string().uuid();
export function safeNext(raw: string | undefined) {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    /[\\\r\n]/.test(raw)
  )
    return "/saved";
  try {
    const u = new URL(raw, "http://nexus.local");
    return u.origin === "http://nexus.local" ? u.pathname + u.search : "/saved";
  } catch {
    return "/saved";
  }
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const expected =
    (process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : undefined) ??
    `${req.nextUrl.protocol}//${req.headers.get("host") ?? req.nextUrl.host}`;
  if (origin && origin !== expected)
    throw new DomainError("请求来源不匹配", 403);
}
export async function readBody(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > 100000)
    throw new DomainError("请求内容过大", 413);
  const body = await req.text();
  if (Buffer.byteLength(body) > 100000)
    throw new DomainError("请求内容过大", 413);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new DomainError("JSON 格式不正确");
  }
}
export function errorResponse(e: unknown) {
  if (e instanceof ZodError)
    return NextResponse.json(
      {
        error: e.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("；"),
      },
      { status: 400 },
    );
  if (e instanceof DomainError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  const message = e instanceof Error ? e.message : "";
  if (["UNAUTHORIZED", "FORBIDDEN"].includes(message))
    return NextResponse.json(
      { error: message === "UNAUTHORIZED" ? "请先登录" : "需要管理员权限" },
      { status: message === "UNAUTHORIZED" ? 401 : 403 },
    );
  if (
    (e as { code?: string })?.code === "23505" ||
    (e as { cause?: { code?: string } })?.cause?.code === "23505"
  )
    return NextResponse.json(
      { error: "稳定标识已存在，请检查重复活动" },
      { status: 409 },
    );
  console.error(
    "[nexus] request failed",
    e instanceof Error ? `${e.name}: ${e.message}` : "unknown",
  );
  return NextResponse.json(
    { error: "服务暂不可用，请稍后重试" },
    { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
