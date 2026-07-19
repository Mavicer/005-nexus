import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { listFavorites } from "@/lib/favorites";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CredibilityBadge } from "@/components/competition-card";

export const dynamic = "force-dynamic";

/**
 * 个人 Dashboard v1（P1 最小占位 + 收藏复用，P2 完整化）
 *
 * 护栏：不建新表、不加字段。成长系统（计划/路线/经历）P4 才做，此处灰态占位。
 * 仅复用：GET /api/favorites（收藏列表）+ getCurrentUser。
 *
 * 收藏列表字段：复用 listFavorites（FavoriteItem: title/summary/credibilityScore/signUpEnd 等）。
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">需要登录</h1>
        <Link
          href="/login?next=/dashboard"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          去登录
        </Link>
      </main>
    );
  }

  const favorites = await listFavorites(user.userId);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          我的面板
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* 我的收藏 */}
          <Card>
            <div className="border-b border-neutral-100 px-4 py-2.5">
              <h2 className="text-sm font-medium text-neutral-900">我的收藏</h2>
            </div>
            <div className="px-4 py-3">
              {favorites.length === 0 ? (
                <EmptyState
                  title="还没有收藏"
                  description="去探索竞赛，收藏感兴趣的"
                />
              ) : (
                <ul className="space-y-2">
                  {favorites.map((f) => (
                    <li key={f.favoriteId}>
                      <Link
                        href={`/competitions/${f.infoItemId}`}
                        className="block rounded-md border border-neutral-100 p-3 hover:bg-neutral-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-neutral-900">
                            {f.title}
                          </p>
                          <CredibilityBadge score={f.credibilityScore} />
                        </div>
                        {f.summary && (
                          <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                            {f.summary}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <aside className="lg:col-span-1 space-y-3">
          {/* 成长占位（灰态，不查库，预告 P4） */}
          <Card className="p-4 opacity-60">
            <p className="text-sm font-medium text-neutral-700">成长规划</p>
            <p className="mt-1 text-xs text-neutral-400">
              个人路线、课表、任务管理
            </p>
            <span className="mt-3 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400">
              即将上线
            </span>
          </Card>
          <Card className="p-4 opacity-60">
            <p className="text-sm font-medium text-neutral-700">成长记录</p>
            <p className="mt-1 text-xs text-neutral-400">
              记录你的参赛经历与成果
            </p>
            <span className="mt-3 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-400">
              即将上线
            </span>
          </Card>
        </aside>
      </div>
    </main>
  );
}
