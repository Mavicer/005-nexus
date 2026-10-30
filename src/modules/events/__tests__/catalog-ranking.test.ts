import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { D1DatabaseSession } from "@cloudflare/workers-types";
import { D1Store } from "@/db/d1-store";
import { eventSchema, listSchema } from "../schema";
import { registrationState } from "../time";
import { recommendationScore } from "../recommendation";
import { directoryRank, directoryRankSql, directoryMatch } from "../directory";
import {
  recognitionPriority,
  recognitionPrioritySql,
  editorialAssessment,
} from "../editorial";
import { fixture } from "./fixture";

// Exercise the real D1 query in an isolated SQLite database, without production access.
function session(sqlite: DatabaseSync) {
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return { sql, values };
        },
      };
    },
    async batch(statements: { sql: string; values: never[] }[]) {
      return statements.map(({ sql, values }) => ({
        results: sqlite.prepare(sql).all(...values),
      }));
    },
  } as unknown as D1DatabaseSession;
}
it("prioritizes domestic events, lowers overseas onsite events and keeps manual sorts", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync("migrations/0001_nexus.sql", "utf8"));
    sqlite.exec(
      "INSERT INTO users(id,email,created_at,updated_at) VALUES('test','test@test.invalid','2026-10-31','2026-10-31')",
    );
    const samples = [
      ["domestic-online", "domestic", "online"],
      ["domestic-onsite", "domestic", "onsite"],
      ["foreign-online", "international", "online"],
      ["foreign-hybrid", "international", "hybrid"],
      ["foreign-onsite", "international", "onsite"],
    ];
    for (const [id, region, mode] of samples) {
      const event = eventSchema.parse({
        ...fixture(),
        region,
        mode,
        entry: "direct",
        mainlandEligibility: "eligible",
        evidence: {
          ...fixture().evidence,
          region: "rules",
          entry: "rules",
          mainlandEligibility: "rules",
        },
      });
      sqlite
        .prepare(
          "INSERT INTO nexus_events(id,slug,title,kind,mode,status,review_state,published_data,updated_at,created_at,created_by) VALUES(?,?,?,?,?,'published','verified',?,'2026-10-30','2026-10-30','test')",
        )
        .run(id!, id!, id!, event.kind, event.mode, JSON.stringify(event));
    }
    const now = new Date("2026-10-31T00:00:00Z");
    const store = new D1Store(session(sqlite));
    const d1 = await store.queryEvents({ state: "all" }, now);
    const expected = samples.map(([id]) => id);
    expect(d1.items.map((event) => event.id)).toEqual(expected);
    const pg = new PgDialect().sqlToQuery(recommendationScore(now)).sql;
    const base = pg.match(/CASE[\s\S]*?ELSE 0 END/)![0];
    const pgBase = sqlite
      .prepare(`SELECT id FROM nexus_events ORDER BY (${base}) DESC`)
      .all();
    expect(pgBase.map((row) => row.id)).toEqual(expected);
    const page = await store.queryEvents(
      { state: "all", page: 2, pageSize: 2 },
      now,
    );
    expect(page.items.map((event) => event.id)).toEqual(expected.slice(2, 4));
    expect(
      (await store.queryEvents({ state: "all", region: "international" }, now))
        .total,
    ).toBe(3);
    expect(
      (
        await store.queryEvents({ state: "all", sort: "updated" }, now)
      ).items.map((event) => event.id),
    ).toEqual([...expected].sort());
  } finally {
    sqlite.close();
  }
});
it("validates the new batch without duplicate identities or pretending closed events are open", () => {
  const batch = JSON.parse(
    readFileSync("data/curated/2026-10-31-domestic-hardware.json", "utf8"),
  ).map((event: unknown) => eventSchema.parse(event));
  expect(listSchema.parse({}).state).toBe("all");
  expect(batch).toHaveLength(12);
  expect(new Set(batch.map((event: { slug: string }) => event.slug)).size).toBe(
    12,
  );
  const now = new Date("2026-10-31T00:00:00Z");
  for (const event of batch) {
    if (
      event.slug.startsWith("robomaster") ||
      event.slug.startsWith("nuedc") ||
      event.slug === "embedded-fpga-2026"
    )
      expect(registrationState(event, now)).toBe("closed");
  }
  expect(
    registrationState(
      batch.find(
        (event: { slug: string }) =>
          event.slug === "huawei-ict-innovation-2027",
      ),
      now,
    ),
  ).toBe("open");
});

it("separates source-backed directory matches from editorial judgement", () => {
  expect(directoryRank("cumcm-2026")).toBe(2);
  expect(directoryRank("embedded-fpga-2026")).toBe(1);
  expect(directoryMatch("robomaster-rmuc-2027")?.status).toBe("scope_pending");
  expect(directoryRank("ccf-ccsp-2026")).toBe(0);
  expect(directoryRank("comap-mcm-icm-2027")).toBe(0);
  expect(directoryRank("unknown-national-competition")).toBe(0);
  expect(editorialAssessment("atcoder-abc482").level).toBeLessThan(
    editorialAssessment("ccf-ccsp-2026").level,
  );
  expect(recognitionPriority("robomaster-rmul-2027")).toBeGreaterThan(
    recognitionPriority("cumcm-2026"),
  );
  expect(recognitionPriority("robomaster-rmua-2026")).toBeGreaterThan(
    recognitionPriority("cumcm-2026"),
  );
  expect(recognitionPriority("robomaster-rmuc-2027")).toBeGreaterThan(
    recognitionPriority("qoder-campus-2026"),
  );
});
it("ranks professional benchmarks ahead of new events and applies explicit directory sorting before pagination", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(readFileSync("migrations/0001_nexus.sql", "utf8"));
    sqlite.exec(
      "INSERT INTO users(id,email,created_at,updated_at) VALUES('test','test@test.invalid','2026-10-31','2026-10-31')",
    );
    const slugs = [
      "qoder-campus-2026",
      "comap-mcm-icm-2027",
      "cumcm-2026",
      "embedded-fpga-2026",
      "robomaster-rmuc-2027",
    ];
    for (const slug of slugs) {
      const closed = [
        "cumcm-2026",
        "robomaster-rmuc-2027",
        "embedded-fpga-2026",
      ].includes(slug);
      const event = eventSchema.parse({
        ...fixture(),
        slug,
        registrationSignal: closed ? "closed" : "open",
        evidence: { ...fixture().evidence, registration: "rules" },
      });
      sqlite
        .prepare(
          "INSERT INTO nexus_events(id,slug,title,kind,mode,status,review_state,published_data,updated_at,created_at,created_by) VALUES(?,?,?,?,?,'published','verified',?,'2026-10-30','2026-10-30','test')",
        )
        .run(slug, slug, slug, event.kind, event.mode, JSON.stringify(event));
    }
    const store = new D1Store(session(sqlite));
    const now = new Date("2026-10-31T00:00:00Z");
    const overall = await store.queryEvents(
      { state: "all", sort: "recommended" },
      now,
    );
    expect(overall.items.map((event) => event.slug)).toEqual([
      "robomaster-rmuc-2027",
      "cumcm-2026",
      "comap-mcm-icm-2027",
      "embedded-fpga-2026",
      "qoder-campus-2026",
    ]);
    const catalog = await store.queryEvents(
      { state: "all", sort: "directory", pageSize: 2 },
      now,
    );
    expect(catalog.items.map((event) => event.slug)).toEqual([
      "cumcm-2026",
      "embedded-fpga-2026",
    ]);
    expect(catalog.total).toBe(5);
    const open = await store.queryEvents(
      { state: "open", sort: "directory" },
      now,
    );
    expect(open.items).toHaveLength(2);
    const pgOrder = sqlite
      .prepare(
        `SELECT slug FROM nexus_events ORDER BY (${recognitionPrioritySql('"nexus_events"."slug"')}) DESC, slug`,
      )
      .all();
    expect(pgOrder[0]!.slug).toBe("robomaster-rmuc-2027");
    const rows = sqlite
      .prepare(
        `SELECT slug, (${directoryRankSql("slug")}) AS rank FROM nexus_events`,
      )
      .all();
    expect(rows.find((row) => row.slug === "comap-mcm-icm-2027")!.rank).toBe(0);
  } finally {
    sqlite.close();
  }
});
