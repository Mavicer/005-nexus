import { readFile } from "node:fs/promises";
import { z } from "zod";
import { Pool } from "pg";
const rows = z
  .array(
    z.object({
      legacyId: z.string().uuid(),
      eventId: z.string().uuid().nullable(),
      reason: z.string().min(5).max(500),
    }),
  )
  .parse(JSON.parse(await readFile(process.argv[2] ?? "", "utf8")));
if (!process.env.DATABASE_URL || !process.argv.includes("--backup-confirmed"))
  throw new Error("必须显式设置旧库地址并确认备份；先运行 legacy:plan");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query("SELECT pg_advisory_xact_lock(68413027)");
  for (const row of rows) {
    const [old] = (
      await c.query("SELECT id FROM info_items WHERE id=$1", [row.legacyId])
    ).rows;
    if (!old) throw new Error("映射的旧记录不存在");
    if (row.eventId) {
      const [target] = (
        await c.query(
          "SELECT id FROM nexus_events WHERE id=$1 AND status='published'",
          [row.eventId],
        )
      ).rows;
      if (!target) throw new Error("目标赛事必须先核验并发布");
    }
    await c.query(
      "INSERT INTO nexus_legacy_map(legacy_id,event_id,reason) VALUES($1,$2,$3) ON CONFLICT(legacy_id) DO NOTHING",
      [row.legacyId, row.eventId, row.reason],
    );
    const [saved] = (
      await c.query(
        "SELECT event_id,reason FROM nexus_legacy_map WHERE legacy_id=$1",
        [row.legacyId],
      )
    ).rows;
    if (saved.event_id !== row.eventId)
      throw new Error("已存在不同映射，停止以避免覆盖收藏关系");
    if (row.eventId)
      await c.query(
        "INSERT INTO nexus_bookmarks(user_id,event_id,created_at) SELECT user_id,$2,created_at FROM favorites WHERE info_item_id=$1 ON CONFLICT(user_id,event_id) DO NOTHING",
        [row.legacyId, row.eventId],
      );
  }
  await c.query("COMMIT");
  console.log(JSON.stringify({ mapped: rows.length, oldRowsDeleted: 0 }));
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
