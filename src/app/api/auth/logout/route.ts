import { cookies } from "next/headers";
import { blogSsoEnabled, blogRequest, BLOG_COOKIE } from "@/lib/blog-sso";
import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { sameOrigin, errorResponse } from "@/lib/http";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    if (blogSsoEnabled()) {
      const store = await cookies(),
        token = store.get(BLOG_COOKIE)?.value;
      if (token) await blogRequest("logout", { token });
      store.delete(BLOG_COOKIE);
    }
    await clearSession();
    return NextResponse.redirect(new URL("/", req.url), 303);
  } catch (e) {
    return errorResponse(e);
  }
}
