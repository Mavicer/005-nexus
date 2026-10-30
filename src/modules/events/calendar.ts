import { DateTime } from "luxon";
import type { EventInput, Milestone } from "./schema";
function escape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function fold(s: string): string {
  const chunks: string[] = [];
  let line = "";
  for (const c of s) {
    if (Buffer.byteLength(line + c, "utf8") > 74) {
      chunks.push(line);
      line = " " + c;
    } else line += c;
  }
  chunks.push(line);
  return chunks.join("\r\n");
}
export function buildCalendar(
  id: string,
  e: EventInput,
  version: number,
  only?: string,
  now = new Date(),
): string {
  const points = e.milestones.filter(
    (m) =>
      (!only || m.id === only) &&
      m.start &&
      ["instant", "date"].includes(m.precision),
  );
  if (!points.length) throw new Error("没有可精确导出的时间，请查看官方原文");
  const stamp = DateTime.fromJSDate(now)
    .toUTC()
    .toFormat("yyyyMMdd'T'HHmmss'Z'");
  const date = (s: string) =>
    DateTime.fromISO(s, { setZone: true })
      .toUTC()
      .toFormat("yyyyMMdd'T'HHmmss'Z'");
  const event = (m: Milestone) =>
    [
      "BEGIN:VEVENT",
      `UID:${id}-${m.id}@nexus`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${version}`,
      m.precision === "instant"
        ? `DTSTART:${date(m.start!)}`
        : `DTSTART;VALUE=DATE:${m.start!.replaceAll("-", "")}`,
      m.end
        ? m.precision === "instant"
          ? `DTEND:${date(m.end)}`
          : `DTEND;VALUE=DATE:${DateTime.fromISO(m.end).plus({ days: 1 }).toFormat("yyyyMMdd")}`
        : "",
      `SUMMARY:${escape(`${e.title} · ${m.label}`)}`,
      `DESCRIPTION:${escape(`一次性日历快照；报名资格与变更请以官方为准。原文：${m.raw}`)}`,
      `URL:${e.officialUrl}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ].filter(Boolean);
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nexus//Developer Events//ZH",
      "CALSCALE:GREGORIAN",
      ...points.flatMap(event),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
