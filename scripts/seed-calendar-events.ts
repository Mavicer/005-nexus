/**
 * 资源日历时间节点种子脚本（第2步正规化）
 *
 * 读 seed-calendar-events.data.ts 的 CALENDAR_EVENTS（54 条，Agent B 从 DB 导出），
 * 幂等 insert：按 title 去重，已存在则跳过。
 *   - 运行 DB 已有 54 条 → no-op（全部跳过）
 *   - fresh clone（空表）→ 灌入 54 条
 *   - 部分缺失 → 补齐缺失的（按 title）
 *
 * 数据原值不改（Agent B 已核对真实可查，B 准备数据 A 接 insert）。
 * 用法：npm run tsx scripts/seed-calendar-events.ts
 */
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { calendarEvents } from "@/db/schema";
import { CALENDAR_EVENTS } from "./seed-calendar-events.data";

async function main() {
  let inserted = 0;
  let skipped = 0;

  for (const e of CALENDAR_EVENTS) {
    // 幂等：按 title 去重，已存在则跳过
    const existing = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(eq(calendarEvents.title, e.title))
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(calendarEvents).values({
      title: e.title,
      category: e.category,
      startDate: e.startDate || null,
      endDate: e.endDate || null,
      description: e.description,
      relatedMajors: e.relatedMajors,
      officialSource: e.officialSource || null,
      sourceUrl: e.sourceUrl || null,
      credibility: e.credibility.toString(),
    });
    inserted++;
  }

  console.log(
    `[seed-calendar-events] 完成：新增 ${inserted} 条 / 跳过(已存在) ${skipped} 条 / 共 ${CALENDAR_EVENTS.length} 条`,
  );
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error("[seed-calendar-events] 失败:", err);
    pool.end();
    process.exit(1);
  });
