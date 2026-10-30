import { usingD1 } from "@/db/cloudflare";
import { cache } from "react";
import { blogSsoEnabled, getBlogUser } from "./blog-sso";
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
  return new TextEncoder().encode(secret ?? DEV_SECRET);
}

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

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const getCurrentUser = cache(
  async (): Promise<SessionPayload | null> => {
    if (blogSsoEnabled()) return getBlogUser();
    if (usingD1()) return null;
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, getSecret(), {
        algorithms: ["HS256"],
      });
      if (
        typeof payload.sub !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(payload.sub)
      )
        return null;
      userId = payload.sub;
    } catch {
      return null;
    }
    const [user] = await db
      .select({ userId: users.id, email: users.email, isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  },
);

export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!user.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return { ...user, isAdmin: true };
}

export async function requireAdminPage(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.isAdmin) return null;
  return { ...user, isAdmin: true };
}
