import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fixture } from "@/modules/events/__tests__/fixture";
const origin = process.env.TEST_ORIGIN ?? "http://127.0.0.1:3040";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("HTTP smoke test is local-only");
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1)];
    }),
);
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
await check("health and public SSR", async () => {
  assert.equal((await fetch(origin + "/api/health")).status, 200);
  const r = await fetch(origin + "/");
  assert.equal(r.status, 200);
  const s = await r.text();
  assert(s.includes("赛事"));
  assert(!s.includes("BUILD SOMETHING THAT MATTERS"));
  assert(!s.includes("下一场实践"));
});
await check("invalid pagination and malformed body", async () => {
  assert.equal((await fetch(origin + "/api/events?page=1.2")).status, 400);
  assert.equal(
    (
      await fetch(origin + "/api/auth/login", {
        method: "POST",
        body: "null",
        headers: { "Content-Type": "application/json" },
      })
    ).status,
    400,
  );
});
await check("admin requires auth and foreign origins rejected", async () => {
  assert.equal((await fetch(origin + "/api/admin/events")).status, 401);
  assert.equal(
    (
      await fetch(origin + "/api/auth/login", {
        method: "POST",
        headers: {
          Origin: "https://unrelated.invalid",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
});
const login = await fetch(origin + "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_INIT_PASSWORD,
  }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
const headers = { "Content-Type": "application/json", cookie, Origin: origin };
await check("admin role checked after login", async () => {
  assert.equal(
    (await fetch(origin + "/api/admin/events", { headers })).status,
    200,
  );
});
const p = fixture();
p.slug = `http-smoke-${Date.now()}`;
p.title = "回归验证草稿（非真实赛事）";
const create = await fetch(origin + "/api/admin/events", {
  method: "POST",
  headers,
  body: JSON.stringify(p),
});
assert.equal(create.status, 201);
const draft = (await create.json()) as { id: string; version: number };
await check(
  "HTTP drafts stay private and publication requires review",
  async () => {
    assert.equal((await fetch(origin + `/api/events/${draft.id}`)).status, 404);
    const r = await fetch(origin + `/api/admin/events/${draft.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ version: 1, action: "publish" }),
    });
    assert.equal(r.status, 400);
  },
);
await check(
  "verify requires explicit acknowledgement and updates use a version",
  async () => {
    assert.equal(
      (
        await fetch(origin + `/api/admin/events/${draft.id}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ version: 1, action: "verify" }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(origin + `/api/admin/events/${draft.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ version: 999, payload: p }),
        })
      ).status,
      409,
    );
  },
);
const list = (await (await fetch(origin + "/api/events?state=all")).json()) as {
  items: Array<{ id: string; slug: string }>;
};
const event = list.items[0]!;
await check("bookmarks and calendar download", async () => {
  assert.equal(
    (
      await fetch(origin + `/api/bookmarks/${event.id}`, {
        method: "POST",
        headers,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(origin + `/api/bookmarks/${event.id}`, {
        method: "DELETE",
        headers,
      })
    ).status,
    200,
  );
  const r = await fetch(origin + `/api/events/${event.id}/calendar`);
  assert.equal(r.status, 200);
  assert(r.headers.get("Content-Type")?.includes("text/calendar"));
  assert((await r.text()).includes("BEGIN:VEVENT"));
});
await check("safe login return and compatibility redirect", async () => {
  const r = await fetch(origin + "/login?next=javascript:alert(1)");
  assert.equal(r.status, 200);
  const text = await r.text();
  assert(!text.includes('next":"javascript:'));
  const old = await fetch(origin + "/dashboard", { redirect: "manual" });
  assert([307, 308].includes(old.status));
  assert(old.headers.get("location")?.endsWith("/saved"));
});
await fetch(origin + `/api/admin/events/${draft.id}`, {
  method: "POST",
  headers,
  body: JSON.stringify({ version: 1, action: "withdraw" }),
});
console.log(`HTTP smoke: ${passed} passed`);
