import assert from "node:assert/strict";
import { db, pool } from "@/db/client";
import { users, events, revisions, bookmarks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { fixture } from "@/modules/events/__tests__/fixture";
import {
  saveDraft,
  changePublication,
  queryEvents,
} from "@/modules/events/service";
if (!new URL(process.env.DATABASE_URL ?? "").pathname.endsWith("_integration"))
  throw new Error("Only isolated integration databases");
const stamp = `rank-${Date.now()}`;
const [actor] = await db
  .insert(users)
  .values({ email: `${stamp}@test.invalid`, passwordHash: "!test" })
  .returning();
const ids: string[] = [];
try {
  const make = async (name: string, overrides: Record<string, unknown>) => {
    const e = {
      ...fixture(),
      slug: `${stamp}-${name}`,
      title: `${stamp} ${name}`,
      edition: `${stamp}-${name}`,
      region: "international",
      entry: "direct",
      mainlandEligibility: "unknown",
      fee: "free",
      ...overrides,
    };
    Object.assign(e.evidence, {
      region: "rules",
      entry: "rules",
      mainlandEligibility: "rules",
      fee: "rules",
    });
    const d = await saveDraft(e, actor!.id);
    ids.push(d.id);
    await changePublication(d.id, d.version, "verify", actor!.id);
    await changePublication(d.id, d.version, "publish", actor!.id);
    return d;
  };
  await make("foreign-onsite", { mode: "onsite", entry: "application" });
  await make("domestic", {
    mode: "onsite",
    region: "domestic",
    mainlandEligibility: "eligible",
  });
  await make("online-unknown", {});
  await make("online-direct", { mainlandEligibility: "eligible" });
  await make("ineligible", { mainlandEligibility: "ineligible" });
  await make("closed", {
    mainlandEligibility: "eligible",
    registrationSignal: "closed",
    evidence: { ...fixture().evidence, registration: "rules" },
  });
  const now = new Date("2026-10-20T00:00:00Z");
  const result = await queryEvents({ q: stamp, state: "all" }, now);
  const names = result.items.map((e) => e.slug.slice(stamp.length + 1));
  assert.deepEqual(names, [
    "online-direct",
    "domestic",
    "online-unknown",
    "foreign-onsite",
    "ineligible",
    "closed",
  ]);
  const page = await queryEvents(
    { q: stamp, state: "all", pageSize: 2, page: 2 },
    now,
  );
  assert.deepEqual(
    page.items.map((e) => e.slug.slice(stamp.length + 1)),
    names.slice(2, 4),
  );
  assert.equal(page.total, 6);
  const deadline = await queryEvents(
    { q: stamp, state: "all", sort: "deadline" },
    now,
  );
  assert.equal(deadline.items.length, 6);
  console.log(
    "PASS recommendation: online direct > domestic > other online > foreign onsite; ineligible lowered, closed last; pagination after ranking; manual sort retained",
  );
} finally {
  if (ids.length) {
    await db.delete(bookmarks).where(inArray(bookmarks.eventId, ids));
    await db.transaction(async (tx) => {
      await tx.delete(revisions).where(inArray(revisions.eventId, ids));
      await tx.delete(events).where(inArray(events.id, ids));
    });
  }
  await db.delete(users).where(eq(users.id, actor!.id));
  await pool.end();
}
