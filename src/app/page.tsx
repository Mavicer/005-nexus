import { Suspense } from "react";

import { searchItems } from "@/lib/search";
import { SearchBox } from "@/components/search-box";
import { SearchFilters } from "@/components/search-filters";
import { SearchCard } from "@/components/search-card";
import { Pagination } from "@/components/pagination";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * 首页（SSR 首屏，利于 SEO 与弱网首屏）
 * 护栏2：只调 searchItems()，不写 SQL
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;

  const query = get("q");
  const level = get("level");
  const recognition = get("recognition");
  const suitableGrade = get("suitableGrade");
  const sort = get("sort") ?? "relevance";
  const page = Number(get("page") ?? "1");

  const result = await searchItems({
    query,
    filters: {
      level:
        level && ["school", "provincial", "national", "international"].includes(level)
          ? (level as "school" | "provincial" | "national" | "international")
          : undefined,
      recognition:
        recognition &&
        ["official_A", "leaderboard_listed", "normal"].includes(recognition)
          ? (recognition as "official_A" | "leaderboard_listed" | "normal")
          : undefined,
      suitableGrade,
    },
    sort: {
      by:
        sort === "credibility" || sort === "closing" ? sort : "relevance",
    },
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 20,
  });

  const qs = new URLSearchParams();
  if (query) qs.set("q", query);
  if (level) qs.set("level", level);
  if (recognition) qs.set("recognition", recognition);
  if (suitableGrade) qs.set("suitableGrade", suitableGrade);
  if (sort && sort !== "relevance") qs.set("sort", sort);
  const basePath = qs.toString();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {SITE_NAME}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{SITE_TAGLINE}</p>
      </header>

      <div className="mb-6">
        <SearchBox />
      </div>

      <div className="mb-6 border-b border-neutral-100 pb-4">
        <Suspense>
          <SearchFilters />
        </Suspense>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <span>
          {query
            ? `搜索「${query}」`
            : "全部竞赛"}
          · 共 {result.total} 条
        </span>
      </div>

      {result.hits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          没有找到相关竞赛，试试其他关键词或调整筛选条件
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result.hits.map((hit) => (
            <SearchCard key={hit.id} hit={hit} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath={basePath}
      />
    </main>
  );
}
