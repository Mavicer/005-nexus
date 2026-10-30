import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { getPlatformProxy } from "wrangler";
import { D1Store } from "@/db/d1-store";
import { queryEvents } from "@/modules/events/service";
const proxy = await getPlatformProxy<CloudflareEnv>({
  configPath: "wrangler.jsonc",
  persist: false,
});
try {
  const db = proxy.env.DB;
  const migration = await readFile("migrations/0001_nexus.sql", "utf8");
  await db.batch(
    migration
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => db.prepare(x)),
  );
  const catalog = await readFile(process.argv[2]!, "utf8");
  await db.batch(
    catalog
      .split("\n")
      .filter(Boolean)
      .map((x) => db.prepare(x)),
  );
  const store = new D1Store(db.withSession("first-primary"));
  const now = new Date("2026-10-30T12:00:00Z");
  const probes = [
    {},
    { state: "all" },
    { q: "网络安全" },
    { q: "网络安全", state: "all" },
    { q: "数模" },
    { q: "Python" },
    { q: "算法" },
    { q: "线上" },
    { region: "domestic" },
    { entry: "direct", mode: "online" },
    { fee: "free", sort: "deadline" },
    { sort: "updated" },
    { within: 30 },
    { q: "CTF 线上" },
    { q: "100%不存在" },
  ];
  for (const probe of probes) {
    const [pg, d1] = await Promise.all([
      queryEvents(probe, now),
      store.queryEvents(probe, now),
    ]);
    assert.equal(d1.total, pg.total, JSON.stringify(probe));
    assert.deepEqual(
      d1.items.map((r) => r.id),
      pg.items.map((r) => r.id),
      JSON.stringify(probe),
    );
  }
  const actor = await store.identity("https://mavicer.cc", "test-user", "test");
  const ids = await Promise.all(
    Array.from({ length: 4 }, () =>
      store.identity("https://mavicer.cc", "test-concurrent", "test"),
    ),
  );
  assert.equal(new Set(ids).size, 1);
  const existing = (await store.getCalendarRows())[0]!;
  const payload = {
    ...existing.publishedData,
    slug: "integration-only",
    edition: "integration-only",
  };
  const draft = await store.saveDraft(payload, actor);
  assert.equal(await store.getPublicEvent(draft.id), null);
  await assert.rejects(() =>
    store.changePublication(draft.id, draft.version, "publish", actor),
  );
  await store.changePublication(draft.id, draft.version, "verify", actor);
  await store.changePublication(draft.id, draft.version, "publish", actor);
  await store.addBookmark(actor, draft.id);
  await store.addBookmark(actor, draft.id);
  assert.equal((await store.listBookmarks(actor)).length, 1);
  const next = await store.saveDraft(
    { ...payload, title: "draft title" },
    actor,
    draft.id,
    draft.version,
  );
  assert.equal(
    (await store.getPublicEvent(draft.id))!.publishedData.title,
    payload.title,
  );
  await assert.rejects(() =>
    store.saveDraft(payload, actor, draft.id, draft.version),
  );
  await store.changePublication(draft.id, next.version, "withdraw", actor);
  assert.equal(await store.getPublicEvent(draft.id), null);
  assert.equal((await store.listBookmarks(actor))[0]!.payload, null);
  await store.removeBookmark(actor, draft.id);
  assert.equal(await store.hasBookmark(actor, draft.id), false);
  console.log(
    "PASS: 15 PostgreSQL/D1 parity cases, concurrent identity, draft isolation, verify/publish, stale edit, idempotent bookmark and withdrawal",
  );
} finally {
  await proxy.dispose();
  const { pool } = await import("@/db/client");
  await pool.end();
}
