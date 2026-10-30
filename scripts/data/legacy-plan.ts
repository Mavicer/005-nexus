import { Pool } from "pg";
if (!process.env.DATABASE_URL) throw new Error("必须显式指定 DATABASE_URL");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  await c.query("BEGIN READ ONLY");
  const exists = await c.query(
    "SELECT to_regclass('public.info_items') AS info,to_regclass('public.favorites') AS favorites,to_regclass('public.nexus_legacy_map') AS mapping",
  );
  if (!exists.rows[0].info) {
    console.log(
      JSON.stringify({ mode: "dry-run", legacy: false, changes: 0 }, null, 2),
    );
  } else {
    const rows = await c.query(
      "SELECT id,category,title,status FROM info_items ORDER BY id",
    );
    const mapped = exists.rows[0].mapping
      ? await c.query("SELECT legacy_id,event_id,reason FROM nexus_legacy_map")
      : { rows: [] };
    const map = new Map(mapped.rows.map((r) => [r.legacy_id, r]));
    const counts = exists.rows[0].favorites
      ? (await c.query("SELECT count(*)::int AS count FROM favorites")).rows[0]
          .count
      : 0;
    const plan = rows.rows.map((r) => ({
      legacyId: r.id,
      title: r.title,
      category: r.category,
      mappedEventId: map.get(r.id)?.event_id ?? null,
      decision: map.has(r.id)
        ? "reviewed_mapping"
        : r.category !== "competition"
          ? "outside_scope_keep_history"
          : "needs_rule_review",
      reason: map.get(r.id)?.reason ?? "未经逐项核验，不自动迁入公开目录",
    }));
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          legacy: true,
          oldItems: plan.length,
          oldFavorites: counts,
          changes: 0,
          items: plan,
        },
        null,
        2,
      ),
    );
  }
  await c.query("ROLLBACK");
} finally {
  c.release();
  await pool.end();
}
