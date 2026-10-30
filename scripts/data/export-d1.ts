// Offline export only: review this SQL before applying it to the Nexus D1 database.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { eventSchema, canonicalUrl } from "@/modules/events/schema";
import {
  instant,
  closingBoundary,
  registrationState,
} from "@/modules/events/time";
const [input, output] = process.argv.slice(2);
if (!input || !output || !process.argv.includes("--reviewed"))
  throw new Error(
    "用法：node --import tsx scripts/data/export-d1.ts 已核验赛事.json 输出.sql --reviewed（仅生成SQL，不连接数据库）",
  );
const batch = z
  .array(eventSchema)
  .min(1)
  .max(100)
  .parse(JSON.parse(await readFile(input, "utf8")));
const keys = batch.map(
  (event) => `${canonicalUrl(event.officialUrl)}#${event.edition}`,
);
if (
  new Set(keys).size !== keys.length ||
  new Set(batch.map((event) => event.slug)).size !== batch.length
)
  throw new Error("批次包含重复slug或赛事身份");
function uuid(key: string) {
  const hex = createHash("sha256")
    .update("nexus-curated:" + key)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const quote = (value: unknown): string =>
  value == null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : "'" + String(value).replaceAll("'", "''") + "'";
const actor = uuid("catalog-importer"),
  now = new Date().toISOString();
const iso = (value: Date | null) => value?.toISOString() ?? null;
function insert(table: string, row: Record<string, unknown>, guard = "") {
  const columns = Object.keys(row).join(",");
  const values = Object.values(row).map(quote).join(",");
  return `INSERT OR IGNORE INTO ${table} (${columns}) ${guard ? `SELECT ${values} WHERE ${guard}` : `VALUES (${values})`};`;
}
const sql = [
  "-- Additive import; existing events/revisions are never overwritten.",
  insert("users", {
    id: actor,
    email: `catalog-${actor}@identity.invalid`,
    password_hash: "!catalog-import",
    name: "赛事收录",
    is_admin: 0,
    created_at: now,
    updated_at: now,
  }),
];
for (const event of batch) {
  const id = uuid(event.slug),
    revision = uuid(event.slug + ":1");
  const payload = JSON.stringify(event);
  const period = event.milestones.find((m) => m.kind === "event");
  sql.push(
    insert("nexus_events", {
      id,
      slug: event.slug,
      identity_key: `${canonicalUrl(event.officialUrl)}#${event.edition}`,
      title: event.title,
      kind: event.kind,
      mode: event.mode,
      status: "published",
      review_state: "verified",
      review_method: "agent",
      version: 1,
      published_version: 1,
      published_data: payload,
      verified_at: now,
      registration_opens_at: iso(
        instant(event.milestones.find((m) => m.kind === "registration_open")),
      ),
      registration_closes_at: iso(
        closingBoundary(
          event.milestones.find((m) => m.kind === "registration_close"),
        ),
      ),
      event_ends_at: iso(period?.end ? closingBoundary(period) : null),
      created_at: now,
      updated_at: now,
      created_by: actor,
    }),
  );
  sql.push(
    insert(
      "nexus_event_revisions",
      {
        id: revision,
        event_id: id,
        version: 1,
        note: "curated official-source import",
        payload,
        created_by: actor,
        created_at: now,
        review_method: "agent",
        verified_by: actor,
        verified_at: now,
        published_at: now,
      },
      `EXISTS(SELECT 1 FROM nexus_events WHERE id=${quote(id)})`,
    ),
  );
}
await writeFile(output, sql.join("\n") + "\n");
console.log(
  JSON.stringify({
    output,
    events: batch.length,
    states: batch.map((event) => ({
      slug: event.slug,
      state: registrationState(event),
    })),
  }),
);
