import { DateTime } from "luxon";
import Link from "next/link";
import { getCalendarRows } from "@/modules/events/service";
import { overlapsMonth, displayTime } from "@/modules/events/time";
export const dynamic = "force-dynamic";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month =
    raw ?? DateTime.now().setZone("Asia/Shanghai").toFormat("yyyy-MM");
  const date = DateTime.fromISO(`${month}-01`, { zone: "Asia/Shanghai" });
  if (!/^\d{4}-\d{2}$/.test(month) || !date.isValid)
    return (
      <div className="panel empty">
        <h1>月份格式不正确</h1>
        <Link href="/calendar">返回当前月份</Link>
      </div>
    );
  let rows;
  try {
    rows = await getCalendarRows();
  } catch {
    return (
      <div className="panel empty">
        <h1>日历服务暂不可用</h1>
        <Link href="/calendar">重试</Link>
      </div>
    );
  }
  const entries = rows
    .flatMap((row) =>
      row.publishedData.milestones
        .filter((m) => overlapsMonth(m, month))
        .map((m) => ({ row, m })),
    )
    .sort((a, b) => (a.m.start ?? "").localeCompare(b.m.start ?? ""));
  return (
    <>
      <div className="intro">
        <div>
          <h1>赛事日历</h1>
        </div>
        <form className="actions" method="get">
          <label className="sr-only" htmlFor="month">
            选择月份
          </label>
          <input type="month" id="month" name="month" defaultValue={month} />
          <button className="btn">查看</button>
        </form>
      </div>
      <div className="result-meta">
        <Link
          href={`/calendar?month=${date.minus({ months: 1 }).toFormat("yyyy-MM")}`}
        >
          ← 上个月
        </Link>
        <strong>{date.toFormat("yyyy 年 MM 月")} · 北京时间</strong>
        <Link
          href={`/calendar?month=${date.plus({ months: 1 }).toFormat("yyyy-MM")}`}
        >
          下个月 →
        </Link>
      </div>
      <div className="panel">
        {entries.length ? (
          entries.map(({ row, m }) => (
            <article className="calendar-row" key={`${row.id}-${m.id}`}>
              <div className="calendar-date">{m.label}</div>
              <div>
                <h3>
                  <Link href={`/events/${row.slug}`}>{row.title} ↗</Link>
                </h3>
                <p className="small muted" style={{ margin: 0 }}>
                  {displayTime(m)}
                </p>
                <div className="actions">
                  <a
                    className="small"
                    style={{ color: "var(--accent)" }}
                    href={`/api/events/${row.id}/calendar?milestone=${m.id}`}
                  >
                    导出此节点 ↓
                  </a>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <h2>本月暂无已公布的精确时间节点</h2>
            <p>
              月份或日期待定的活动仍可在赛事详情查看，不会用猜测时间填入日历。
            </p>
            <Link href="/?state=all" className="btn">
              查看全部活动
            </Link>
          </div>
        )}
      </div>
      <p className="small muted">
        导出为一次性快照；延期与规则变更请及时回到官方确认。
      </p>
    </>
  );
}
