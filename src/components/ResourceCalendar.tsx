"use client";

import { useState, useMemo } from "react";
import type { CalendarEvent } from "@/lib/calendar";
import { CALENDAR_CATEGORY_LABELS } from "@/lib/calendar-constants";

const CATEGORY_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  competition: { dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  research: { dot: "bg-purple-400", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  internship: { dot: "bg-green-400", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  exam: { dot: "bg-red-400", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  graduate: { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};
const FALLBACK_COLORS = { dot: "bg-neutral-400", bg: "bg-neutral-50", text: "text-neutral-600", border: "border-neutral-200" };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_LABELS = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export function ResourceCalendar({
  eventsByMonth,
  year,
}: {
  eventsByMonth: Record<number, CalendarEvent[]>;
  year: number;
}) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0] ?? "";
  const todayMonth = now.getMonth() + 1;
  const todayDate = now.getDate();

  const [viewMode, setViewMode] = useState<"month" | "timeline">("month");
  const [selectedMonth, setSelectedMonth] = useState(todayMonth);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const monthEvents = useMemo(
    () => eventsByMonth[selectedMonth] ?? [],
    [eventsByMonth, selectedMonth],
  );

  // 生成月历格子 + 跨日期事件处理
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, selectedMonth - 1, 1);
    const lastDay = new Date(year, selectedMonth, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const days: ({ day: number; events: CalendarEvent[]; spanning: CalendarEvent[] } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = monthEvents.filter((e) => {
        const start = e.startDate ?? "";
        const end = e.endDate ?? start;
        return dateStr >= start && dateStr <= end;
      });
      // 跨日期事件：只在开始日显示（不每天重复）
      const singleDay = dayEvents.filter((e) => (e.startDate ?? "") === dateStr);
      const spanning = dayEvents.filter((e) => (e.startDate ?? "") !== dateStr && (e.startDate ?? "") < dateStr);
      days.push({ day: d, events: singleDay, spanning });
    }
    return days;
  }, [year, selectedMonth, monthEvents]);

  // 即将到来
  const upcoming = useMemo(() => {
    const all = Object.values(eventsByMonth).flat();
    return all
      .filter((e) => e.startDate && e.startDate >= todayStr)
      .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
      .slice(0, 8);
  }, [eventsByMonth, todayStr]);

  // 月份摘要
  const monthSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    monthEvents.forEach((e) => {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    });
    const total = monthEvents.length;
    const parts: string[] = [];
    for (const [cat, count] of Object.entries(counts)) {
      const label = CALENDAR_CATEGORY_LABELS[cat] ?? cat;
      parts.push(`${count}个${label}`);
    }
    return { total, parts };
  }, [monthEvents]);

  function openEvent(event: CalendarEvent) {
    setSelectedEvent(event);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function goToToday() {
    setSelectedMonth(todayMonth);
  }

  return (
    <div>
      {/* 视图切换 + 今天按钮 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("month")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "month" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            月视图
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "timeline" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            时间轴
          </button>
        </div>
        <button
          onClick={goToToday}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900"
        >
          今天
        </button>
      </div>

      {viewMode === "month" ? (
        <>
          {/* 月份切换 + 摘要 */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setSelectedMonth((m) => (m > 1 ? m - 1 : 12))}
              className="text-lg text-neutral-400 hover:text-neutral-900"
            >
              ‹
            </button>
            <div className="text-center">
              <span className="text-base font-medium text-neutral-900">
                {year}年{MONTH_LABELS[selectedMonth]}
              </span>
              {monthSummary.total > 0 && (
                <p className="mt-0.5 text-xs text-neutral-400">
                  本月 {monthSummary.total} 个重要节点 · {monthSummary.parts.join(" · ")}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedMonth((m) => (m < 12 ? m + 1 : 1))}
              className="text-lg text-neutral-400 hover:text-neutral-900"
            >
              ›
            </button>
          </div>

          {/* 单月日历网格 */}
          <div className="overflow-hidden rounded-lg border border-neutral-100">
            <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-2 text-center text-xs text-neutral-400">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((dayData, i) => {
                if (!dayData) {
                  return <div key={i} className="min-h-[80px] border-b border-r border-neutral-50 bg-neutral-50/50" />;
                }
                const isToday = selectedMonth === todayMonth && dayData.day === todayDate;
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] border-b border-r border-neutral-50 p-1 ${isToday ? "bg-blue-50/40" : ""}`}
                  >
                    <span
                      className={`text-xs ${
                        isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                          : "text-neutral-400"
                      }`}
                    >
                      {dayData.day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayData.spanning.slice(0, 1).map((event) => {
                        const colors = CATEGORY_COLORS[event.category] ?? FALLBACK_COLORS;
                        return (
                          <div
                            key={event.id}
                            className={`rounded px-1 py-0.5 text-[10px] ${colors.bg} ${colors.text} opacity-40`}
                          >
                            ┄ {event.title.length > 8 ? event.title.slice(0, 8) + "…" : event.title}
                          </div>
                        );
                      })}
                      {dayData.events.slice(0, 3).map((event) => {
                        const colors = CATEGORY_COLORS[event.category] ?? FALLBACK_COLORS;
                        return (
                          <button
                            key={event.id}
                            onClick={() => openEvent(event)}
                            className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] transition-transform hover:scale-105 ${colors.bg} ${colors.text}`}
                          >
                            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                            {event.title.length > 10 ? event.title.slice(0, 10) + "…" : event.title}
                          </button>
                        );
                      })}
                      {dayData.events.length > 3 && (
                        <span className="text-[10px] text-neutral-300">+{dayData.events.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 即将到来 */}
          {upcoming.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium text-neutral-900">即将到来</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {upcoming.map((event) => {
                  const colors = CATEGORY_COLORS[event.category] ?? FALLBACK_COLORS;
                  const days = Math.ceil(
                    (new Date(event.startDate ?? "").getTime() - now.getTime()) / 86400000,
                  );
                  return (
                    <button
                      key={event.id}
                      onClick={() => openEvent(event)}
                      className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-neutral-900">{event.title}</p>
                        <p className="text-xs text-neutral-400">{event.startDate}</p>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {days > 0 ? `${days}天后` : "今天"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* 时间轴模式 */
        <div className="space-y-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const events = eventsByMonth[month] ?? [];
            if (events.length === 0) return null;
            return (
              <div key={month}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900">{MONTH_LABELS[month]}</span>
                  <span className="text-xs text-neutral-300">{events.length} 项</span>
                </div>
                <div className="ml-2 space-y-1 border-l border-neutral-100 pl-4">
                  {events.map((event) => {
                    const colors = CATEGORY_COLORS[event.category] ?? FALLBACK_COLORS;
                    return (
                      <button
                        key={event.id}
                        onClick={() => openEvent(event)}
                        className="flex w-full items-center gap-2 py-1 text-left transition-colors hover:bg-neutral-50"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                        <span className="text-xs text-neutral-700">{event.title}</span>
                        <span className="text-xs text-neutral-300">{event.startDate}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 右侧抽屉详情 */}
      {drawerOpen && selectedEvent && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={closeDrawer}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 p-4">
              <span className="text-sm font-medium text-neutral-900">事件详情</span>
              <button
                onClick={closeDrawer}
                className="text-neutral-400 hover:text-neutral-900"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              {(() => {
                const colors = CATEGORY_COLORS[selectedEvent.category] ?? FALLBACK_COLORS;
                return (
                  <>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {CALENDAR_CATEGORY_LABELS[selectedEvent.category] ?? selectedEvent.category}
                    </span>
                    <h3 className="mt-3 text-lg font-medium text-neutral-900">{selectedEvent.title}</h3>
                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                      <div>
                        <p className="text-xs text-neutral-400">时间</p>
                        <p className="mt-0.5">
                          {selectedEvent.startDate === selectedEvent.endDate
                            ? selectedEvent.startDate
                            : `${selectedEvent.startDate} ~ ${selectedEvent.endDate}`}
                        </p>
                      </div>
                      {selectedEvent.description && (
                        <div>
                          <p className="text-xs text-neutral-400">简介</p>
                          <p className="mt-0.5">{selectedEvent.description}</p>
                        </div>
                      )}
                      {selectedEvent.officialSource && (
                        <div>
                          <p className="text-xs text-neutral-400">来源</p>
                          {selectedEvent.sourceUrl ? (
                            <a
                              href={selectedEvent.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-block text-blue-600 hover:underline"
                            >
                              {selectedEvent.officialSource} →
                            </a>
                          ) : (
                            <p className="mt-0.5">{selectedEvent.officialSource}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

