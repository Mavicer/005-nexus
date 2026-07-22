/**
 * 资源日历查询（专业资源库配套模块）
 *
 * 从 calendar_events 表按月份/专业查询时间节点。
 * 不计算适配度，纯时间信息展示。
 */
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import type { MajorCategoryInfo } from "@/lib/knowledge/major-resource-map";
export { CALENDAR_CATEGORY_LABELS, CALENDAR_CATEGORY_COLORS } from "./calendar-constants";

export interface CalendarEvent {
  id: string;
  title: string;
  category: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  relatedMajors: string[] | null;
  officialSource: string | null;
  sourceUrl: string | null;
  credibility: string | null;
}



/**
 * 查全年日历事件（按月份分组）
 * @param major 可选专业过滤
 * @param year 年份（如 2026）
 */
export async function getCalendarEvents(
  major: MajorCategoryInfo | null,
  year: number,
): Promise<Record<number, CalendarEvent[]>> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const conditions = [
    sql`start_date IS NOT NULL`,
    sql`start_date >= ${yearStart}`,
    sql`start_date <= ${yearEnd}`,
  ];

  if (major) {
    conditions.push(sql`related_majors @> ARRAY[${major.id}]::text[]`);
  }

  const rows = await db.execute(sql`
    SELECT id, title, category, start_date, end_date, description,
           related_majors, official_source, source_url, credibility
    FROM calendar_events
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY start_date ASC
  `);

  // 按月份分组
  const byMonth: Record<number, CalendarEvent[]> = {};
  for (const row of rows.rows as Record<string, unknown>[]) {
    const startDateRaw = row.start_date as unknown;
    if (!startDateRaw) continue;
    // pg date 可能返回 string 或 Date，统一转 string 取月份
    const startDateStr = typeof startDateRaw === "string" ? startDateRaw : (startDateRaw as Date).toISOString().split("T")[0]!;
    const month = parseInt(startDateStr.split("-")[1] ?? "1", 10);
    if (!byMonth[month]) byMonth[month] = [];
    const endDateRaw = row.end_date as unknown;
    const endDateStr = endDateRaw
      ? (typeof endDateRaw === "string" ? endDateRaw : (endDateRaw as Date).toISOString().split("T")[0] ?? null)
      : null;
    byMonth[month].push({
      id: row.id as string,
      title: row.title as string,
      category: row.category as string,
      startDate: startDateStr,
      endDate: endDateStr,
      description: (row.description as string | null) ?? null,
      relatedMajors: (row.related_majors as string[] | null) ?? null,
      officialSource: (row.official_source as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
      credibility: row.credibility != null ? String(row.credibility) : null,
    });
  }

  return byMonth;
}
