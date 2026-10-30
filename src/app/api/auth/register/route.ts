import { usingD1 } from "@/db/cloudflare";
import { blogSsoEnabled } from "@/lib/blog-sso";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { authInput } from "@/lib/auth-input";
import { hashPassword } from "@/lib/password";
import { readBody, sameOrigin, errorResponse } from "@/lib/http";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    if (blogSsoEnabled() || usingD1())
      return NextResponse.json(
        { error: "请使用博客账号登录" },
        { status: 409 },
      );
    const b = authInput.parse(await readBody(req)),
      [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email})=${b.email}`)
        .limit(1);
    if (existing)
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    const [u] = await db
      .insert(users)
      .values({ email: b.email, passwordHash: await hashPassword(b.password) })
      .returning();
    await createSession({ userId: u!.id, email: u!.email, isAdmin: false });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
