import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  isPasswordValid,
  isEmailValid,
} from "@/lib/password";
import { createSession } from "@/lib/auth";

/** POST /api/auth/register */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isEmailValid(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (email.length > 254) {
    return NextResponse.json({ error: "邮箱过长" }, { status: 400 });
  }
  if (!isPasswordValid(password)) {
    return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
  }
  if (password.length > 1024) {
    return NextResponse.json({ error: "密码过长" }, { status: 400 });
  }

  // 邮箱唯一（DB unique 兜底，这里先查给友好提示）
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id, email: users.email, isAdmin: users.isAdmin });

  if (!created) {
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }

  await createSession({
    userId: created.id,
    email: created.email,
    isAdmin: created.isAdmin,
  });
  return NextResponse.json({ user: { id: created.id, email: created.email } });
}
