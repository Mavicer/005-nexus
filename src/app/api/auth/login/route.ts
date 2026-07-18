import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

/** POST /api/auth/login */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    // 统一错误：不泄露邮箱是否存在
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }
  // 长度上限（nit-3，防 argon2 超大输入 DoS）
  if (email.length > 254 || password.length > 1024) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }
  const ok = await verifyPassword(row.passwordHash, password);
  if (!ok) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  await createSession({
    userId: row.id,
    email: row.email,
    isAdmin: row.isAdmin,
  });
  return NextResponse.json({ user: { id: row.id, email: row.email } });
}
