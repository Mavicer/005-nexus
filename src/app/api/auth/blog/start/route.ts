import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { safeNext, errorResponse } from "@/lib/http";
import {
  blogSsoEnabled,
  ssoConfig,
  randomToken,
  challenge,
  signFlow,
  FLOW_COOKIE,
  cookieOptions,
} from "@/lib/blog-sso";
export async function GET(req: NextRequest) {
  try {
    if (!blogSsoEnabled())
      return NextResponse.json({ error: "博客登录尚未启用" }, { status: 503 });
    const cfg = ssoConfig(),
      state = randomToken(),
      verifier = randomToken();
    const next = safeNext(req.nextUrl.searchParams.get("next") ?? "/");
    (await cookies()).set(
      FLOW_COOKIE,
      await signFlow({ state, verifier, next }),
      { ...cookieOptions, maxAge: 300 },
    );
    const url = new URL("/api/auth/nexus/authorize", cfg.blog);
    url.search = new URLSearchParams({
      client_id: "nexus",
      redirect_uri: cfg.callback,
      state,
      code_challenge: challenge(verifier),
      code_challenge_method: "S256",
      ...(req.nextUrl.searchParams.get("prompt") === "none"
        ? { prompt: "none" }
        : {}),
    }).toString();
    return NextResponse.redirect(url, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
