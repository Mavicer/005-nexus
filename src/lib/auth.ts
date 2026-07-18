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
 *
 * 安全（Agent B 第 9 条必改）：
 *   生产环境 AUTH_SECRET 缺失或 <32 字节 → 拒绝启动（抛错）。
 *   否则应用会用公开已知密钥运行，任何人可伪造 JWT 绕过认证。
 *   dev 才允许兜底密钥。
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE_DAYS = 7;
const DEV_SECRET = "dev-only-change-me-to-a-long-random-string";
const MIN_SECRET_BYTES = 32;

export interface SessionPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // 生产：AUTH_SECRET 必填且 ≥32 字节，否则拒绝启动
    if (!secret) {
      throw new Error(
        "[auth] 生产环境必须设置 AUTH_SECRET 环境变量（≥32 字节随机串）",
      );
    }
    if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) {
      throw new Error(
        `[auth] 生产环境 AUTH_SECRET 长度不足 ${MIN_SECRET_BYTES} 字节，拒绝启动`,
      );
    }
    return new TextEncoder().encode(secret);
  }

  // dev：允许兜底密钥（仅本地开发）
  return new TextEncoder().encode(secret ?? DEV_SECRET);
}

/** 签发 JWT 并写入 httpOnly cookie（7 天滑动过期） */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    isAdmin: payload.isAdmin,
  })
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
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

/** 取数据库中的最新 isAdmin（防止 JWT 内旧权限被滥用） */
async function fetchIsAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.isAdmin ?? false;
}

/** 要求登录，否则抛 UNAUTHORIZED（供 API 路由用） */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * 要求管理员，否则抛 UNAUTHORIZED(未登录) / FORBIDDEN(非管理员)
 * isAdmin 以数据库实时值为准（JWT 内的 isAdmin 仅作快路径，实际校验查库）
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const isAdmin = await fetchIsAdmin(user.userId);
  if (!isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return { ...user, isAdmin: true };
}
