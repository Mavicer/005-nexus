import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { listFavorites, groupFavorites, type FavoriteItem } from "@/lib/favorites";
import { getProfile } from "@/lib/profile";
import { getMajorResources } from "@/lib/major-resources";
import { matchMajorCategory, type MajorCategory } from "@/lib/knowledge/major-resource-map";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteItemCard } from "@/components/favorite-item-card";
import { CredibilityBadge } from "@/components/ui/badge";
import type { InfoCategory } from "@/db/schema-enums";

export const dynamic = "force-dynamic";

const GRADE_LABEL: Record<string, string> = {
  freshman: "大一",
  sophomore: "大二",
  junior: "大三",
  senior: "大四",
};

const CATEGORY_LABELS: Record<string, string> = {
  competition: "竞赛",
  research: "科研",
  internship: "实习",
  exam: "认证考试",
  opportunity: "学习平台/项目",
  baoyan: "夏令营",
  scholarship: "奖学金",
};

const CATEGORY_ORDER: InfoCategory[] = [
  "competition",
  "research",
  "internship",
  "exam",
  "opportunity",
  "baoyan",
];

/**
 * 专业资源库（Dashboard 转型版）
 * 不再计算适配度/因子/成长路线，纯专业分类资源导航。
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

  const profile = await getProfile(user.userId);
  const [favorites, userRow] = await Promise.all([
    listFavorites(user.userId),
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1),
  ]);
  const createdAt = userRow[0]?.createdAt;
  const grade = profile?.grade ?? null;
  const favGroups = groupFavorites(favorites);

  // 从用户专业推断 MajorCategory
  const majorText = profile?.major ?? null;
  const majorDirection = profile?.majorDirection ?? null;
  const majorCategory = matchMajorCategory(majorText, majorDirection as MajorCategory | null);

  // 取该专业分类的资源
  const majorResources = majorCategory
    ? await getMajorResources(majorCategory)
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          专业资源库
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {majorCategory
            ? `根据你的专业（${majorCategory.label}），发现相关成长资源`
            : "完善专业信息后，查看相关成长资源"}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* 专业资源分类展示 */}
          {majorResources && majorCategory ? (
            <>
              {CATEGORY_ORDER.map((cat) => {
                const items = majorResources[cat];
                if (!items || items.length === 0) return null;
                return (
                  <ResourceCategorySection
                    key={cat}
                    category={cat}
                    items={items}
                  />
                );
              })}

              {/* 专业技能（静态展示） */}
              {majorCategory.skills.length > 0 && (
                <Card className="p-4">
                  <h2 className="text-sm font-medium text-neutral-900">技能学习</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {majorCategory.skills.map((s) => (
                      <Tag key={s} variant="neutral">{s}</Tag>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-5">
              <p className="text-sm font-medium text-neutral-900">
                选择你的专业方向
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                选择专业后，系统将展示该领域的竞赛、科研、实习、认证等资源。
              </p>
              <Link href="/onboarding" className="mt-3 inline-block">
                <Button variant="secondary">完善资料</Button>
              </Link>
            </Card>
          )}

          {/* 我的收藏（保留） */}
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
                  title="还没有收藏的机会"
                  description="去探索，收藏适合你的机会"
                  action={
                    <Link href="/explore">
                      <Button>探索机会</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-4">
                  <OpportunityGroup
                    title="即将截止"
                    count={favGroups.closing.length}
                    items={favGroups.closing}
                    tone="danger"
                  />
                  <OpportunityGroup
                    title="近期收藏"
                    count={favGroups.recent.length}
                    items={favGroups.recent}
                    tone="neutral"
                  />
                  <OpportunityGroup
                    title="长期规划"
                    count={favGroups.longterm.length}
                    items={favGroups.longterm}
                    tone="neutral"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="lg:col-span-1 space-y-3">
          {/* 个人资料（简化：学校/专业/年级，删目标/能力/硬约束） */}
          <Card className="p-4">
            <p className="text-sm font-medium text-neutral-900">个人资料</p>
            <div className="mt-3 space-y-1.5 text-xs text-neutral-500">
              <p>
                邮箱：<span className="text-neutral-700">{user.email}</span>
              </p>
              {profile?.school && (
                <p>
                  学校：<span className="text-neutral-700">{profile.school}</span>
                </p>
              )}
              {profile?.major && (
                <p>
                  专业：<span className="text-neutral-700">{profile.major}</span>
                </p>
              )}
              {majorCategory && (
                <p>
                  专业分类：<span className="text-neutral-700">{majorCategory.label}</span>
                </p>
              )}
              {grade && (
                <p>
                  年级：
                  <span className="text-neutral-700">
                    {GRADE_LABEL[grade] ?? grade}
                  </span>
                </p>
              )}
              {createdAt && (
                <p className="pt-1">
                  注册：<span className="text-neutral-700">
                    {createdAt.toLocaleDateString("zh-CN")}
                  </span>
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
              <Link href="/settings">
                <Button variant="secondary" className="text-xs">
                  编辑资料
                </Button>
              </Link>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="ghost" className="text-xs">
                  登出
                </Button>
              </form>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}

/** 资源分类卡片 */
function ResourceCategorySection({
  category,
  items,
}: {
  category: string;
  items: { id: string; title: string; summary: string | null; credibilityScore: string | null }[];
}) {
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <Card>
      <div className="border-b border-neutral-100 px-4 py-2.5">
        <h2 className="text-sm font-medium text-neutral-900">{label}</h2>
      </div>
      <div className="px-4 py-3">
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/o/${item.id}`}
              className="block rounded-md border border-neutral-100 p-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                <CredibilityBadge score={item.credibilityScore} />
              </div>
              {item.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                  {item.summary}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** 机会池分组（保留） */
function OpportunityGroup({
  title,
  count,
  items,
  tone,
}: {
  title: string;
  count: number;
  items: FavoriteItem[];
  tone: "danger" | "neutral";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`text-xs font-medium ${
            tone === "danger" ? "text-red-600" : "text-neutral-500"
          }`}
        >
          {title}
        </span>
        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((f) => (
          <FavoriteItemCard
            key={f.favoriteId}
            infoItemId={f.infoItemId}
            title={f.title}
            summary={f.summary}
            credibilityScore={f.credibilityScore}
          />
        ))}
      </div>
    </div>
  );
}
