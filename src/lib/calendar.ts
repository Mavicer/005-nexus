/**
 * 资源日历查询（专业资源库配套模块）
 *
 * 从 calendar_events 表按月份/专业查询时间节点。
 * 不计算适配度，纯时间信息展示。
 *
 * 第2步正规化：改用 schema 的 calendarEvents 表走 drizzle typed 查询
 * （原裸 SQL db.execute 已退役，跟 schema 同步、typed）。
 */
import { db } from "@/db/client";
import { calendarEvents } from "@/db/schema";
import { and, gte, lte, isNotNull, asc, sql } from "drizzle-orm";
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
    isNotNull(calendarEvents.startDate),
    gte(calendarEvents.startDate, yearStart),
    lte(calendarEvents.startDate, yearEnd),
  ];

  if (major) {
    conditions.push(sql`${calendarEvents.relatedMajors} @> ARRAY[${major.id}]::text[]`);
  }

  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      category: calendarEvents.category,
      startDate: calendarEvents.startDate,
      endDate: calendarEvents.endDate,
      description: calendarEvents.description,
      relatedMajors: calendarEvents.relatedMajors,
      officialSource: calendarEvents.officialSource,
      sourceUrl: calendarEvents.sourceUrl,
      credibility: calendarEvents.credibility,
    })
    .from(calendarEvents)
    .where(and(...conditions))
    .orderBy(asc(calendarEvents.startDate));

  // 按月份分组
  const byMonth: Record<number, CalendarEvent[]> = {};
  for (const row of rows) {
    if (!row.startDate) continue;
    // drizzle date 列返回 string（YYYY-MM-DD）
    const startDateStr = row.startDate;
    const month = parseInt(startDateStr.split("-")[1] ?? "1", 10);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push({
      id: row.id,
      title: row.title,
      category: row.category,
      startDate: startDateStr,
      endDate: row.endDate ?? null,
      description: row.description ?? null,
      relatedMajors: row.relatedMajors ?? null,
      officialSource: row.officialSource ?? null,
      sourceUrl: row.sourceUrl ?? null,
      credibility: row.credibility != null ? String(row.credibility) : null,
    });
  }

  return byMonth;
}
