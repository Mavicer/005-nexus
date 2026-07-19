import { Suspense } from "react";

import { searchItems } from "@/lib/search";
import { SearchBar } from "@/components/ui/search-bar";
import { SearchFilters } from "@/components/search-filters";
import { SearchCard } from "@/components/search-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  CompetitionLevel,
  CompetitionRecognition,
  SearchSortBy,
} from "@/lib/search";

export const dynamic = "force-dynamic";

/**
 * 搜索页 /explore（SSR）
 * 护栏2：只调 searchItems()，不写 SQL
 */
export default async function ExplorePage({
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
      level: parseLevel(level),
      recognition: parseRecognition(recognition),
      suitableGrade,
    },
    sort: { by: parseSort(sort) },
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
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          探索竞赛
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          搜索全国通用竞赛，判断适不适合你、现在该不该准备
        </p>
      </header>

      <div className="mb-5">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      <div className="mb-5 border-b border-neutral-100 pb-4">
        <Suspense>
          <SearchFilters baseHref="/explore" />
        </Suspense>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <span>
          {query ? `搜索「${query}」` : "全部竞赛"} · 共 {result.total} 条
        </span>
      </div>

      {result.hits.length === 0 ? (
        <EmptyState
          title="没有找到相关竞赛"
          description="试试其他关键词或调整筛选条件"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {result.hits.map((hit) => (
            <SearchCard key={hit.id} hit={hit} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath={`/explore?${basePath}`}
      />
    </main>
  );
}

function parseLevel(v: string | undefined): CompetitionLevel | undefined {
  if (!v) return undefined;
  return ["school", "provincial", "national", "international"].includes(v)
    ? (v as CompetitionLevel)
    : undefined;
}

function parseRecognition(
  v: string | undefined,
): CompetitionRecognition | undefined {
  if (!v) return undefined;
  return ["official_A", "leaderboard_listed", "normal"].includes(v)
    ? (v as CompetitionRecognition)
    : undefined;
}

function parseSort(v: string): SearchSortBy {
  if (v === "credibility" || v === "closing") return v;
  return "relevance";
}
