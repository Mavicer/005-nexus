import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { getCalendarEvents } from "@/lib/calendar";
import { matchMajorCategory } from "@/lib/knowledge/major-resource-map";
import { ResourceCalendar } from "@/components/ResourceCalendar";
import type { MajorCategory } from "@/lib/knowledge/major-resource-map";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.userId) : null;
  const majorText = profile?.major ?? null;
  const majorDirection = profile?.majorDirection ?? null;
  const majorCategory = matchMajorCategory(majorText, majorDirection as MajorCategory | null);

  const year = 2026;
  const eventsByMonth = await getCalendarEvents(majorCategory, year);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          资源日历
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          掌握大学关键时间节点，不错过重要竞赛、考试、科研与实习机会
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-lg font-medium text-neutral-900">{year}</span>
          {majorCategory && (
            <span className="text-xs text-neutral-400">· {majorCategory.label} 相关</span>
          )}
        </div>
      </header>

      <ResourceCalendar eventsByMonth={eventsByMonth} year={year} />
    </main>
  );
}
