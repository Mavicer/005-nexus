import { DateTime } from "luxon";
import type { EventInput, Milestone } from "./schema";
export function instant(m: Milestone | undefined): Date | null {
  if (!m || m.precision !== "instant" || !m.start) return null;
  return DateTime.fromISO(m.start, { setZone: true }).toUTC().toJSDate();
}
// Date-only deadlines expire after the stated local calendar day; the UI retains date precision.
export function closingBoundary(m: Milestone | undefined): Date | null {
  if (m?.precision === "date" && (m.end ?? m.start))
    return DateTime.fromISO((m.end ?? m.start)!, { zone: m.timezone })
      .plus({ days: 1 })
      .startOf("day")
      .toUTC()
      .toJSDate();
  if (m?.precision === "instant" && m.end)
    return DateTime.fromISO(m.end, { setZone: true }).toUTC().toJSDate();
  return instant(m);
}
export function registrationState(
  e: EventInput,
  now = new Date(),
): "open" | "upcoming" | "closed" | "unknown" {
  if (e.cancellation || e.registrationSignal === "closed") return "closed";
  const open = instant(
    e.milestones.find((m) => m.kind === "registration_open"),
  );
  const close = closingBoundary(
    e.milestones.find((m) => m.kind === "registration_close"),
  );
  if (close && now >= close) return "closed";
  if (open && now < open) return "upcoming";
  const period = e.milestones.find((m) => m.kind === "event");
  const eventEnd = period?.end ? closingBoundary(period) : null;
  if (eventEnd && now >= eventEnd) return "closed";
  if (e.registrationSignal === "open") return "open";
  if (e.registration === "rolling") return "open";
  return e.registration === "window" && open && now >= open && close
    ? "open"
    : "unknown";
}
export const STATE_LABELS = {
  open: "报名开放",
  upcoming: "尚未开启",
  closed: "报名已截止",
  unknown: "报名时间待确认",
};
export function displayTime(m: Milestone, zone = "Asia/Shanghai"): string {
  if (!m.start) return m.raw;
  const format = (s: string) =>
    m.precision === "instant"
      ? DateTime.fromISO(s, { setZone: true })
          .setZone(zone)
          .toFormat("yyyy-MM-dd HH:mm")
      : s;
  return `${format(m.start)}${m.end ? ` — ${format(m.end)}` : ""}${m.precision === "instant" ? ` (${zone === "Asia/Shanghai" ? "北京时间" : zone})` : " · 具体时刻见原文"}`;
}
export function overlapsMonth(
  m: Milestone,
  month: string,
  zone = "Asia/Shanghai",
): boolean {
  if (!m.start || m.precision === "unknown" || m.precision === "month")
    return false;
  const lo = DateTime.fromISO(`${month}-01`, { zone }).startOf("month");
  if (!lo.isValid) return false;
  const hi = lo.plus({ months: 1 });
  const start = DateTime.fromISO(m.start, {
    zone,
    setZone: m.precision === "instant",
  }).setZone(zone);
  const end = m.end
    ? DateTime.fromISO(m.end, {
        zone,
        setZone: m.precision === "instant",
      }).setZone(zone)
    : start;
  return start < hi && (m.precision === "date" ? end.endOf("day") : end) >= lo;
}
