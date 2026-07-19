import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { listFavorites } from "@/lib/favorites";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteItemCard } from "@/components/favorite-item-card";

export const dynamic = "force-dynamic";

/**
 * 个人 Dashboard（P2 完整化）
 *
 * 护栏：不建新表、不加字段。成长系统（计划/路线/经历）P4 才做，此处灰态占位。
 * 复用：listFavorites（收藏）+ getCurrentUser + 查 users.createdAt（个人资料）。
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">需要登录</h1>
        <Link
          href="/login?next=/dashboard"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          去登录
        </Link>
      </main>
    );
  }

  const [favorites, userRow] = await Promise.all([
    listFavorites(user.userId),
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1),
  ]);
  const createdAt = userRow[0]?.createdAt;

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
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
              <h2 className="text-sm font-medium text-neutral-900">我的收藏</h2>
              <Link href="/explore">
                <Button variant="ghost" className="px-2 py-1 text-xs">
                  去探索 →
                </Button>
              </Link>
            </div>
            <div className="px-4 py-3">
              {favorites.length === 0 ? (
                <EmptyState
                  title="还没有收藏"
                  description="去探索竞赛，收藏感兴趣的"
                  action={
                    <Link href="/explore">
                      <Button>探索竞赛</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {favorites.map((f) => (
                    <FavoriteItemCard
                      key={f.favoriteId}
                      infoItemId={f.infoItemId}
                      title={f.title}
                      summary={f.summary}
                      credibilityScore={f.credibilityScore}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="lg:col-span-1 space-y-3">
          {/* 个人资料 */}
          <Card className="p-4">
            <p className="text-sm font-medium text-neutral-900">个人资料</p>
            <div className="mt-3 space-y-1.5 text-xs text-neutral-500">
              <p>
                邮箱：
                <span className="text-neutral-700">{user.email}</span>
              </p>
              {createdAt && (
                <p>
                  注册时间：
                  <span className="text-neutral-700">
                    {createdAt.toLocaleDateString("zh-CN")}
                  </span>
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-neutral-100 pt-3">
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="secondary" className="w-full">
                  登出
                </Button>
              </form>
            </div>
          </Card>

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
