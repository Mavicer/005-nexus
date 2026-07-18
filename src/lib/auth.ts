/**
 * 会话与认证（护栏：会话库只用 jose，不引 Passport/next-auth）
 *
 * 会话方案选型（Agent B 第 8 条指令，要求写明理由）：
 *   JWT + httpOnly cookie，而非 server session store。理由：
 *   1. MVP 无 Redis，server session store 需要额外存储依赖；JWT 无状态最简。
 *   2. httpOnly cookie 防 XSS 窃取（JS 读不到 token）。
 *   3. jose 轻量纯 JS 无 native 依赖，契合"不引重框架"。
 *
 * cookie：httpOnly + secure(生产) + sameSite=lax + 过期 7 天滑动。
 * 不做 refresh token（MVP 简化）；登出清 cookie。
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE_DAYS = 7;

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? "dev-only-change-me-to-a-long-random-string";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
}

/** 签发 JWT 并写入 httpOnly cookie（7 天滑动过期） */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_DAYS}d`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

/** 清除会话 cookie（登出） */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** 从请求 cookie 解出当前用户；无效或无 token 返回 null */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.userId || !payload.email) return null;
    return { userId: String(payload.userId), email: String(payload.email) };
  } catch {
    return null;
  }
}

/** 要求登录，否则返回 null（供 API 路由用） */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
