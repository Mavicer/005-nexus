import assert from "node:assert/strict";
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { users, events, revisions } from "@/db/schema";
import { fixture } from "@/modules/events/__tests__/fixture";
import {
  saveDraft,
  changePublication,
  getPublicEvent,
  getAdminEvent,
  queryEvents,
} from "@/modules/events/service";
import {
  addBookmark,
  listBookmarks,
  removeBookmark,
} from "@/modules/bookmarks/service";
const database = (await db.execute(sql`SELECT current_database() AS name`))
  .rows[0]?.name;
if (typeof database !== "string" || !database.endsWith("_integration"))
  throw new Error(
    "Integration tests require an isolated *_integration database",
  );
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
try {
  const [admin] = await db
    .insert(users)
    .values({
      email: `admin-${Date.now()}@nexus.invalid`,
      passwordHash: "test-only-unusable-hash",
      isAdmin: true,
    })
    .returning();
  const actor = admin!.id;
  const p = fixture();
  p.slug = `event-${Date.now()}`;
  const draft = await saveDraft(p, actor);
  await check("draft not publicly visible", async () => {
    assert.equal(await getPublicEvent(draft.id), null);
  });
  await check("unverified version cannot publish", async () => {
    await assert.rejects(changePublication(draft.id, 1, "publish", actor));
  });
  await changePublication(draft.id, 1, "verify", actor);
  await changePublication(draft.id, 1, "publish", actor);
  await check("verified aggregate publishes with UTC deadline", async () => {
    const row = await getPublicEvent(draft.id);
    assert.equal(row?.publishedData.title, p.title);
    assert.equal(
      row?.registrationClosesAt?.toISOString(),
      "2026-10-31T16:00:00.000Z",
    );
  });
  const edit = { ...p, title: "Edited title stays private" };
  await saveDraft(edit, actor, draft.id, 1);
  await check(
    "saving a new draft leaves prior public snapshot unchanged",
    async () => {
      assert.equal(
        (await getPublicEvent(draft.id))?.publishedData.title,
        p.title,
      );
      assert.equal((await getAdminEvent(draft.id))?.revision.verifiedAt, null);
    },
  );
  await check("stale edits and stale publication are rejected", async () => {
    await assert.rejects(saveDraft(edit, actor, draft.id, 1));
    await assert.rejects(changePublication(draft.id, 1, "publish", actor));
  });
  await check(
    "deadline closes while submission is still open in SQL query",
    async () => {
      const before = await queryEvents(
        { q: p.title, state: "open" },
        new Date("2026-10-31T15:59:59Z"),
      );
      assert.equal(before.total, 1);
      const after = await queryEvents(
        { q: p.title, state: "open" },
        new Date("2026-10-31T16:00:00Z"),
      );
      assert.equal(after.total, 0);
    },
  );
  await check("bookmarks are idempotent and scoped", async () => {
    await addBookmark(actor, draft.id);
    await addBookmark(actor, draft.id);
    assert.equal((await listBookmarks(actor)).length, 1);
    assert.equal(
      (await listBookmarks("00000000-0000-4000-8000-000000000001")).length,
      0,
    );
  });
  await check(
    "review flag leaves data available but excludes recommendations",
    async () => {
      await changePublication(draft.id, 2, "flag", actor);
      assert.equal(
        (
          await queryEvents(
            { q: p.title, state: "open" },
            new Date("2026-10-20"),
          )
        ).total,
        0,
      );
      assert.equal(
        (await getPublicEvent(draft.id))?.reviewState,
        "needs_review",
      );
    },
  );
  await check(
    "withdrawal redacts bookmark payload and blocks public access",
    async () => {
      await changePublication(draft.id, 2, "withdraw", actor);
      assert.equal(await getPublicEvent(draft.id), null);
      assert.equal((await listBookmarks(actor))[0]?.payload, null);
      await assert.rejects(addBookmark(actor, draft.id));
      await removeBookmark(actor, draft.id);
    },
  );
  await db.execute(
    sql`CREATE FUNCTION nexus_test_fail_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload->>'title'='Transaction failure test' THEN RAISE EXCEPTION 'injected transaction failure'; END IF; RETURN NEW; END; $$`,
  );
  await db.execute(
    sql`CREATE TRIGGER nexus_test_failure BEFORE INSERT ON nexus_event_revisions FOR EACH ROW EXECUTE FUNCTION nexus_test_fail_revision()`,
  );
  await check(
    "failure after inserting event rolls the entire transaction back",
    async () => {
      const bad = {
        ...p,
        slug: `rollback-${Date.now()}`,
        title: "Transaction failure test",
      };
      await assert.rejects(saveDraft(bad, actor));
      assert.equal(
        (await db.select().from(events).where(eq(events.slug, bad.slug)))
          .length,
        0,
      );
    },
  );
  await db.execute(
    sql`DROP TRIGGER nexus_test_failure ON nexus_event_revisions`,
  );
  await db.execute(sql`DROP FUNCTION nexus_test_fail_revision()`);
  await check("withdrawal retains actor history", async () => {
    const [r] = await db
      .select()
      .from(revisions)
      .where(and(eq(revisions.eventId, draft.id), eq(revisions.version, 3)));
    assert.equal(r?.note, "withdraw");
    assert.equal(r?.createdBy, actor);
  });
  console.log(`Integration: ${passed} passed`);
} finally {
  await pool.end();
}
