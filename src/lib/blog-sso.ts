import { usingD1, d1Store } from "@/db/cloudflare";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { db } from "@/db/client";
import { users, blogIdentities } from "@/db/schema";
import { eq } from "drizzle-orm";
export const BLOG_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-nexus_blog" : "nexus_blog";
export const FLOW_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-nexus_flow" : "nexus_flow";
export const blogOrigin = () =>
  new URL(process.env.BLOG_ORIGIN ?? "https://mavicer.cc").origin;
export const blogSsoEnabled = () => process.env.AUTH_PROVIDER === "blog";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export function ssoConfig() {
  const secret = process.env.BLOG_SSO_SECRET;
  const authSecret = process.env.AUTH_SECRET;
  const app = new URL(process.env.APP_ORIGIN ?? "http://127.0.0.1:3040");
  const blog = new URL(blogOrigin());
  if (
    !secret ||
    Buffer.byteLength(secret) < 32 ||
    !authSecret ||
    Buffer.byteLength(authSecret) < 32
  )
    throw new Error("博客登录密钥尚未配置");
  for (const u of [app, blog])
    if (
      u.protocol !== "https:" &&
      !["127.0.0.1", "localhost"].includes(u.hostname)
    )
      throw new Error("统一登录必须使用 HTTPS");
  return {
    secret,
    authSecret: new TextEncoder().encode(authSecret),
    app: app.origin,
    blog: blog.origin,
    callback: app.origin + "/api/auth/blog/callback",
  };
}
export const randomToken = () => randomBytes(32).toString("base64url");
export const challenge = (s: string) =>
  createHash("sha256").update(s).digest("base64url");
export async function blogRequest(
  action: "token" | "introspect" | "logout",
  body: unknown,
) {
  const cfg = ssoConfig();
  const response = await fetch(`${cfg.blog}/api/auth/nexus/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.secret}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("博客账号服务暂时不可用，请重试");
  return response.json() as Promise<unknown>;
}
export async function signFlow(data: {
  state: string;
  verifier: string;
  next: string;
}) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("nexus")
    .setAudience("blog-login-flow")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(ssoConfig().authSecret);
}
export async function readFlow(token: string) {
  const { payload } = await jwtVerify(token, ssoConfig().authSecret, {
    algorithms: ["HS256"],
    issuer: "nexus",
    audience: "blog-login-flow",
  });
  return z
    .object({
      state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      next: z.string(),
    })
    .parse(payload);
}
const identitySchema = z.object({
  active: z.literal(true),
  user: z.object({
    id: z.string().uuid(),
    username: z.string().min(1).max(100),
    display_name: z.string().max(100),
    is_owner: z.boolean(),
  }),
});
export async function getBlogUser() {
  const token = (await cookies()).get(BLOG_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const result = await blogRequest("introspect", { token });
  if (
    result &&
    typeof result === "object" &&
    "active" in result &&
    result.active === false
  )
    return null;
  const { user } = identitySchema.parse(result);
  const issuer = blogOrigin();
  const local = usingD1()
    ? await (await d1Store()).identity(issuer, user.id, user.display_name)
    : await db.transaction(async (tx) => {
        // Serialize first sign-ins for this issuer/subject without matching by email.
        const { sql, and } = await import("drizzle-orm");
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${issuer + ":" + user.id}, 0))`,
        );
        const [identity] = await tx
          .select()
          .from(blogIdentities)
          .where(
            and(
              eq(blogIdentities.issuer, issuer),
              eq(blogIdentities.subject, user.id),
            ),
          );
        if (identity) return identity.userId;
        const [row] = await tx
          .insert(users)
          .values({
            email: `blog-${randomToken()}@identity.invalid`,
            passwordHash: "!external-blog-only",
            name: user.display_name,
            isAdmin: false,
          })
          .returning({ id: users.id });
        await tx
          .insert(blogIdentities)
          .values({ issuer, subject: user.id, userId: row!.id });
        return row!.id;
      });
  return {
    userId: local,
    email: user.username,
    displayName: user.display_name,
    isAdmin: user.is_owner,
  };
}
