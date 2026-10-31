import { FilterSelect } from "@/components/events/filter-select";
import Link from "next/link";
import Form from "next/form";
import { headers } from "next/headers";
import { SearchSubmit } from "@/components/events/search-submit";
import { queryEvents } from "@/modules/events/service";
import {
  KINDS,
  KIND_LABELS,
  MODE_LABELS,
  ENTRY_LABELS,
  FEE_LABELS,
  REGION_LABELS,
  listSchema,
} from "@/modules/events/schema";
import { EventCard } from "@/components/events/card";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requestHeaders = await headers();
  const speculateImages =
    requestHeaders.get("save-data") !== "on" &&
    !["slow-2g", "2g"].includes(requestHeaders.get("ect") ?? "");
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(
      ([, v]) => typeof v === "string" && v !== "",
    ),
  );
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success)
    return (
      <div className="panel empty">
        <h1>筛选参数有误</h1>
        <p>{parsed.error.issues.map((i) => i.message).join("；")}</p>
        <Link className="btn" href="/">
          重置筛选
        </Link>
      </div>
    );
  const p = parsed.data;
  let result;
  try {
    result = await queryEvents(p);
  } catch {
    return (
      <>
        <Intro />
        <div className="panel empty">
          <h2>赛事服务暂时不可用</h2>
          <p>这不是“没有赛事”。请稍后重试，或先到官方来源寻找活动。</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Link className="btn primary" href="/">
              重新加载
            </Link>
            <Link className="btn" href="/about#sources">
              查看官方来源
            </Link>
          </div>
        </div>
      </>
    );
  }
  const pageUrl = (page: number) => {
    const s = new URLSearchParams(
      Object.entries(p)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    s.set("page", String(page));
    return `/?${s}`;
  };
  return (
    <>
      <Intro />
      <Form action="/" scroll={false} className="panel filter-panel">
        <div className="search-row">
          <label className="sr-only" htmlFor="q">
            搜索赛事、技术或关键词
          </label>
          <input
            id="q"
            name="q"
            defaultValue={p.q}
            placeholder="搜索赛事名称、开发方向或关键词…"
            maxLength={200}
          />
          <SearchSubmit />
        </div>
        <div className="filters">
          <FilterSelect
            name="kind"
            label="赛事类型"
            value={p.kind ?? ""}
            options={[
              { value: "", label: "全部类型" },
              ...KINDS.map((value) => ({ value, label: KIND_LABELS[value]! })),
            ]}
          />
          <FilterSelect
            name="mode"
            label="参与方式"
            value={p.mode ?? ""}
            options={[
              { value: "", label: "全部方式" },
              ...Object.entries(MODE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <FilterSelect
            name="state"
            label="报名状态"
            value={p.state}
            options={[
              { value: "open", label: "正在报名" },
              { value: "upcoming", label: "尚未开启" },
              { value: "closed", label: "报名已截止" },
              { value: "unknown", label: "待确认" },
              { value: "all", label: "全部活动" },
            ]}
          />
          <FilterSelect
            name="within"
            label="截止区间"
            value={p.within ? String(p.within) : ""}
            options={[
              { value: "", label: "不限" },
              { value: "7", label: "未来7天" },
              { value: "30", label: "未来30天" },
              { value: "90", label: "未来90天" },
            ]}
          />
          <FilterSelect
            name="sort"
            label="排序"
            value={p.sort}
            options={[
              { value: "directory", label: "全国目录收录优先" },
              { value: "recommended", label: "综合认可度优先" },
              { value: "deadline", label: "报名截止优先" },
              { value: "updated", label: "最近更新" },
            ]}
          />
        </div>
        <details
          className="advanced-filters"
          open={Boolean(p.region || p.entry || p.fee)}
        >
          <summary>
            更多筛选{p.region || p.entry || p.fee ? " · 已启用" : ""}
          </summary>
          <div className="filters">
            {" "}
            {(
              [
                ["region", "地区", REGION_LABELS],
                ["entry", "报名方式", ENTRY_LABELS],
                ["fee", "费用", FEE_LABELS],
              ] as const
            ).map(([key, label, options]) => (
              <FilterSelect
                key={key}
                name={key}
                label={label}
                value={p[key] ?? ""}
                options={[
                  { value: "", label: "不限" },
                  ...Object.entries(options).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            ))}
          </div>
        </details>
      </Form>
      {(p.sort === "recommended" || p.sort === "directory") && (
        <p className="small muted">
          <Link href="/about#directory">排序依据 ↗</Link>
        </p>
      )}
      <div className="result-meta">
        <span>{result.total} 场符合条件的活动</span>
      </div>
      {result.items.length ? (
        <div className="events-grid">
          {result.items.map((e, index) => (
            <EventCard
              key={e.id}
              event={e}
              preloadImage={speculateImages && index < 2}
            />
          ))}
        </div>
      ) : (
        <div className="panel empty">
          <h2>暂时没有符合条件的活动</h2>
          <p>
            {p.state === "open"
              ? "当前仅显示正在报名的活动。"
              : "试试减少筛选条件。"}
          </p>
          <Link
            className="btn"
            href={
              p.q
                ? `/?${new URLSearchParams({ q: p.q, state: "all" })}`
                : "/?state=all"
            }
          >
            {p.q ? "包含已截止的相关赛事" : "查看全部活动"}
          </Link>
        </div>
      )}
      {result.total > p.pageSize && (
        <div className="pagination">
          {p.page > 1 && <Link href={pageUrl(p.page - 1)}>← 上一页</Link>}
          <span>
            第 {p.page} / {Math.ceil(result.total / p.pageSize)} 页
          </span>
          {p.page * p.pageSize < result.total && (
            <Link href={pageUrl(p.page + 1)}>下一页 →</Link>
          )}
        </div>
      )}
    </>
  );
}
function Intro() {
  return (
    <section className="intro">
      <h1>赛事</h1>
      <Link className="btn" href="/calendar">
        查看日历
      </Link>
    </section>
  );
}
