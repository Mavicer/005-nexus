import Link from "next/link";
import { Suspense } from "react";

import { searchItems } from "@/lib/search";
import { SearchBar } from "@/components/ui/search-bar";
import { SearchCard } from "@/components/search-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SUGGEST_CHIPS = ["数学建模", "挑战杯", "ICPC", "保研政策"];

/**
 * 首页（SSR）
 * 护栏2：只调 searchItems()
 * 两种态：无 query = Hero 落地（Hero+热门+即将截止+成长入口）；
 *        有 query = Hero 收紧 + 搜索结果列表。
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q =
    typeof sp.q === "string" ? sp.q : undefined;

  const user = await getCurrentUser();

  if (q) {
    // 搜索结果态
    const result = await searchItems({ query: q, pageSize: 20 });
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-5">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>
        <p className="mb-4 text-xs text-neutral-400">
          搜索「{q}」 · 共 {result.total} 条
        </p>
        {result.hits.length === 0 ? (
          <EmptyState
            title="没有找到相关竞赛"
            description="试试其他关键词"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {result.hits.map((hit) => (
              <SearchCard key={hit.id} hit={hit} />
            ))}
          </div>
        )}
      </main>
    );
  }

  // Hero 落地态
  const [hot, closing] = await Promise.all([
    searchItems({ sort: { by: "credibility" }, pageSize: 4 }),
    searchItems({
      filters: { closingWithinDays: 30 },
      sort: { by: "closing" },
      pageSize: 4,
    }),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-neutral-900">
            大学生未来四年的成长信息操作系统
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-neutral-500">
            发现机会 · 理解价值 · 制定计划 · 记录成长——降低大学阶段的信息差。
          </p>
          <div className="mb-4">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">热门搜索</span>
            {SUGGEST_CHIPS.map((chip) => (
              <Link
                key={chip}
                href={`/?q=${encodeURIComponent(chip)}`}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
              >
                {chip}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 热门机会 */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-medium text-neutral-900">热门机会</h2>
            <Link
              href="/explore?sort=credibility"
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              查看全部 →
            </Link>
          </div>
          {hot.hits.length === 0 ? (
            <EmptyState title="暂无数据" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {hot.hits.map((hit) => (
                <SearchCard key={hit.id} hit={hit} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 即将截止 */}
      {closing.hits.length > 0 && (
        <section className="px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-base font-medium text-neutral-900">
                即将截止
              </h2>
              <Link
                href="/explore?sort=closing"
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                查看全部 →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {closing.hits.map((hit) => (
                <SearchCard key={hit.id} hit={hit} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 成长入口 */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-base font-medium text-neutral-900">
            成长入口
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GrowthCard
              title="探索竞赛"
              desc="搜索全国通用竞赛，判断适不适合你"
              href="/explore"
            />
            <GrowthCard
              title="我的收藏"
              desc="收藏感兴趣的竞赛，随时回看"
              href={user ? "/dashboard" : "/login"}
            />
            <GrowthCard
              title="资源日历"
              desc="掌握大学关键时间节点"
              href="/calendar"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function GrowthCard({
  title,
  desc,
  href,
  disabled = false,
}: {
  title: string;
  desc: string;
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Card className="p-4 opacity-60">
        <p className="text-sm font-medium text-neutral-700">{title}</p>
        <p className="mt-1 text-xs text-neutral-400">{desc}</p>
        <span className="mt-3 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400">
          即将上线
        </span>
      </Card>
    );
  }
  return (
    <Link href={href}>
      <Card className="p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{desc}</p>
        <span className="mt-3 inline-block text-xs text-neutral-400">→</span>
      </Card>
    </Link>
  );
}
