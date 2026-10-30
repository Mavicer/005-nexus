import { usingD1 } from "@/db/cloudflare";
import { blogSsoEnabled } from "@/lib/blog-sso";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { authInput } from "@/lib/auth-input";
import { verifyPassword } from "@/lib/password";
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
      rows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email})=${b.email}`)
        .limit(2);
    const row = rows[0];
    if (
      rows.length !== 1 ||
      !row ||
      !(await verifyPassword(row.passwordHash, b.password))
    )
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    await createSession({
      userId: row.id,
      email: row.email,
      isAdmin: row.isAdmin,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
