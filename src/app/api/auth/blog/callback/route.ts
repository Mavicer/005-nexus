import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { safeNext, errorResponse } from "@/lib/http";
import {
  blogSsoEnabled,
  ssoConfig,
  readFlow,
  blogRequest,
  FLOW_COOKIE,
  BLOG_COOKIE,
  cookieOptions,
} from "@/lib/blog-sso";
export async function GET(req: NextRequest) {
  const store = await cookies();
  try {
    if (!blogSsoEnabled())
      return NextResponse.json({ error: "博客登录尚未启用" }, { status: 503 });
    const cfg = ssoConfig(),
      flow = await readFlow(store.get(FLOW_COOKIE)?.value ?? "");
    if (req.nextUrl.searchParams.get("state") !== flow.state)
      return NextResponse.json(
        { error: "登录状态校验失败，请重新登录" },
        { status: 400 },
      );
    const target = new URL(safeNext(flow.next), cfg.app);
    if (req.nextUrl.searchParams.get("error") === "login_required") {
      store.delete(BLOG_COOKIE);
      return NextResponse.redirect(target, {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }
    const code = z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .parse(req.nextUrl.searchParams.get("code"));
    const result = z
      .object({
        access_token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        expires_at: z.number().int().positive(),
      })
      .parse(
        await blogRequest("token", {
          code,
          code_verifier: flow.verifier,
          redirect_uri: cfg.callback,
        }),
      );
    const maxAge = Math.min(
      30 * 86400,
      result.expires_at - Math.floor(Date.now() / 1000),
    );
    if (maxAge <= 0) throw new Error("博客会话已过期");
    store.set(BLOG_COOKIE, result.access_token, { ...cookieOptions, maxAge });
    return NextResponse.redirect(target, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return errorResponse(e);
  } finally {
    store.delete(FLOW_COOKIE);
  }
}
