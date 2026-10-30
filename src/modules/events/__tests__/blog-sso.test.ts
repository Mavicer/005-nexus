import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const jar = vi.hoisted(
  () => new Map<string, { value: string; options?: unknown }>(),
);
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => jar.get(k),
    set: (k: string, value: string, options: unknown) =>
      jar.set(k, { value, options }),
    delete: (k: string) => jar.delete(k),
  }),
}));
import { GET as start } from "@/app/api/auth/blog/start/route";
import { GET as callback } from "@/app/api/auth/blog/callback/route";
import { FLOW_COOKIE, BLOG_COOKIE, readFlow, challenge } from "@/lib/blog-sso";
beforeEach(() => {
  jar.clear();
  vi.unstubAllGlobals();
  vi.stubEnv("AUTH_PROVIDER", "blog");
  vi.stubEnv("APP_ORIGIN", "https://nexus.mavicer.cc");
  vi.stubEnv("BLOG_ORIGIN", "https://mavicer.cc");
  vi.stubEnv("AUTH_SECRET", "a".repeat(40));
  vi.stubEnv("BLOG_SSO_SECRET", "b".repeat(40));
});
it("binds callback to the browser and PKCE, exchanges only server-to-server and returns to a safe local path", async () => {
  const begin = await start(
    new NextRequest(
      "https://nexus.mavicer.cc/api/auth/blog/start?next=https://evil.test",
    ),
  );
  const url = new URL(begin.headers.get("location")!);
  expect(url.origin).toBe("https://mavicer.cc");
  const flow = await readFlow(jar.get(FLOW_COOKIE)!.value);
  expect(flow.next).toBe("/saved");
  expect(url.searchParams.get("code_challenge")).toBe(challenge(flow.verifier));
  const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
    expect(options.redirect).toBe("manual");
    expect(options.headers).toMatchObject({
      Authorization: `Bearer ${"b".repeat(40)}`,
    });
    expect(JSON.parse(options.body as string).code_verifier).toBe(
      flow.verifier,
    );
    return Response.json({
      access_token: "c".repeat(43),
      expires_at: Math.floor(Date.now() / 1000) + 1000,
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const done = await callback(
    new NextRequest(
      `https://nexus.mavicer.cc/api/auth/blog/callback?state=${flow.state}&code=${"d".repeat(43)}`,
    ),
  );
  expect(done.headers.get("location")).toBe("https://nexus.mavicer.cc/saved");
  expect(jar.get(BLOG_COOKIE)!.value).toBe("c".repeat(43));
  expect(jar.get(BLOG_COOKIE)!.options).toMatchObject({
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  expect(jar.has(FLOW_COOKIE)).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects callback state mismatch before contacting the blog; silent anonymous entry does not loop", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await start(
    new NextRequest(
      "https://nexus.mavicer.cc/api/auth/blog/start?next=/&prompt=none",
    ),
  );
  const invalid = await callback(
    new NextRequest(
      `https://nexus.mavicer.cc/api/auth/blog/callback?state=${"x".repeat(43)}&code=${"d".repeat(43)}`,
    ),
  );
  expect(invalid.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
  await start(
    new NextRequest(
      "https://nexus.mavicer.cc/api/auth/blog/start?next=/&prompt=none",
    ),
  );
  const flow = await readFlow(jar.get(FLOW_COOKIE)!.value);
  const anonymous = await callback(
    new NextRequest(
      `https://nexus.mavicer.cc/api/auth/blog/callback?state=${flow.state}&error=login_required`,
    ),
  );
  expect(anonymous.headers.get("location")).toBe("https://nexus.mavicer.cc/");
  expect(jar.has(BLOG_COOKIE)).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects upstream redirects without following them", async () => {
  const { blogRequest } = await import("@/lib/blog-sso");
  const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { Location: "https://evil.test" } }));
  vi.stubGlobal("fetch", fetcher);
  await expect(blogRequest("introspect", { token: "x".repeat(43) })).rejects.toThrow();
  expect(fetcher.mock.calls).toHaveLength(1);
});
