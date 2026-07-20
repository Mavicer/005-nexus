import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { listFavorites, groupFavorites, type FavoriteItem } from "@/lib/favorites";
import { getProfile } from "@/lib/profile";
import { getRoadmap, isCurrentStage, type RoadmapStage } from "@/lib/growth-roadmap";
import { searchItems } from "@/lib/search";
import {
  getRecommendations,
  recommendReasonPrefix,
  type Recommendation,
} from "@/lib/recommend";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteItemCard } from "@/components/favorite-item-card";
import { CredibilityBadge } from "@/components/ui/badge";
import { LEVEL_LABEL } from "@/lib/labels";
import type { Goal, GoalGrade } from "@/db/schema-enums";

export const dynamic = "force-dynamic";

const GRADE_LABEL: Record<string, string> = {
  freshman: "大一",
  sophomore: "大二",
  junior: "大三",
  senior: "大四",
};

const GOAL_LABEL: Record<string, string> = {
  baoyan: "保研",
  employment: "就业",
  civilService: "考公",
  abroad: "出国",
  entrepreneurship: "创业",
};

/**
 * Dashboard（P4-2 升级：用户画像 + 成长路线 + 收藏）
 * 护栏：个人成长空间非后台，路线只读，措辞「经验参考」
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

  // profile 先取（recommendations 依赖 goal），再并发取其余
  const profile = await getProfile(user.userId);
  const [favorites, userRow, recommendations] = await Promise.all([
    listFavorites(user.userId),
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1),
    getRecommendations(profile),
  ]);
  const createdAt = userRow[0]?.createdAt;
  const goal = profile?.goal ?? null;
  const grade = profile?.grade ?? null;
  const favGroups = groupFavorites(favorites);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          我的成长空间
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* 根据你的目标推荐（P4-3 新增） */}
          {goal ? (
            <RecommendSection goal={goal} recommendations={recommendations} />
          ) : (
            <Card className="p-5">
              <p className="text-sm font-medium text-neutral-900">
                根据你的目标推荐
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                完善资料后，获得适合你的机会推荐。
              </p>
              <Link href="/onboarding" className="mt-3 inline-block">
                <Button variant="secondary">完善资料</Button>
              </Link>
            </Card>
          )}

          {/* 成长路线（P4-2 + Phase A 4.4：AI 方向 overlay） */}
          {goal ? (
            <RoadmapSection goal={goal} grade={grade} majorDirection={profile?.majorDirection ?? null} />
          ) : (
            <Card className="p-5">
              <p className="text-sm font-medium text-neutral-900">你的成长路线</p>
              <p className="mt-2 text-xs text-neutral-500">
                设置主目标后，查看为你生成的专属成长路线。
              </p>
              <Link href="/settings" className="mt-3 inline-block">
                <Button variant="secondary">设置目标</Button>
              </Link>
            </Card>
          )}

          {/* 我的机会池（P5 任务3，分组展示，非后台表格） */}
          <Card>
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
              <h2 className="text-sm font-medium text-neutral-900">我的机会池</h2>
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
          {/* 个人资料（含画像） */}
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
              {grade && (
                <p>
                  年级：
                  <span className="text-neutral-700">
                    {GRADE_LABEL[grade] ?? grade}
                  </span>
                </p>
              )}
              {goal && (
                <p>
                  目标：
                  <span className="text-neutral-700">
                    {GOAL_LABEL[goal] ?? goal}
                  </span>
                </p>
              )}
              {profile?.interests && profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {profile.interests.map((i) => (
                    <Tag key={i} variant="neutral" className="text-[10px]">
                      {i}
                    </Tag>
                  ))}
                </div>
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

          {/* 成长记录占位（P4 仍占位，纯 UI 不查库） */}
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

/** 机会池分组（P5 任务3，卡片式非后台） */
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

/** 成长路线区：Timeline 渲染四阶段，当前年级高亮，挂机会链接 */
async function RoadmapSection({
  goal,
  grade,
  majorDirection,
}: {
  goal: Goal;
  grade: GoalGrade | null;
  majorDirection: string | null;
}) {
  const roadmap = getRoadmap(goal, majorDirection as Parameters<typeof getRoadmap>[1] ?? undefined);

  // 预取每个阶段 relatedCategories 的机会（复用 searchItems，护栏2）
  const stageOpps = await Promise.all(
    roadmap.stages.map(async (stage) => {
      const cats = [
        ...new Set(
          stage.actions.flatMap((a) => a.relatedCategories ?? []),
        ),
      ];
      if (cats.length === 0) return { stageId: stage.grade, links: [] as { id: string; title: string }[] };
      // 逐 category 取 top 2
      const results = await Promise.all(
        cats.map((c) => searchItems({ filters: { category: c }, pageSize: 2 })),
      );
      const links = results
        .flatMap((r) => r.hits)
        .filter((h, i, arr) => arr.findIndex((x) => x.id === h.id) === i)
        .slice(0, 3);
      return { stageId: stage.grade, links: links.map((l) => ({ id: l.id, title: l.title })) };
    }),
  );

  return (
    <Card>
      <div className="border-b border-neutral-100 px-4 py-2.5">
        <h2 className="text-sm font-medium text-neutral-900">
          你的成长路线 · {roadmap.goalLabel}
        </h2>
        <p className="mt-0.5 text-xs text-neutral-400">{roadmap.note}</p>
      </div>
      <div className="px-4 py-3">
        <ol className="space-y-4">
          {roadmap.stages.map((stage, i) => (
            <RoadmapStageItem
              key={stage.grade}
              stage={stage}
              current={isCurrentStage(stage.grade, grade)}
              isLast={i === roadmap.stages.length - 1}
              opps={stageOpps.find((s) => s.stageId === stage.grade)?.links ?? []}
            />
          ))}
        </ol>
      </div>
    </Card>
  );
}

function RoadmapStageItem({
  stage,
  current,
  isLast,
  opps,
}: {
  stage: RoadmapStage;
  current: boolean;
  isLast: boolean;
  opps: { id: string; title: string }[];
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            current ? "bg-neutral-900 ring-2 ring-neutral-200" : "bg-neutral-300"
          }`}
        />
        {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
      </div>
      <div className={`min-w-0 flex-1 pb-1 ${current ? "" : ""}`}>
        <p
          className={`text-sm font-medium ${
            current ? "text-neutral-900" : "text-neutral-700"
          }`}
        >
          {stage.title}
          {current && (
            <span className="ml-2 text-xs font-normal text-neutral-400">
              当前阶段
            </span>
          )}
        </p>
        <ul className="mt-1.5 space-y-1">
          {stage.actions.map((a, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs">
              <span
                className={`mt-0.5 shrink-0 ${
                  a.priority === "high"
                    ? "text-neutral-900"
                    : a.priority === "mid"
                      ? "text-neutral-500"
                      : "text-neutral-400"
                }`}
              >
                {a.priority === "high" ? "●" : a.priority === "mid" ? "●" : "○"}
              </span>
              <div>
                <span className="text-neutral-700">{a.title}</span>
                {a.detail && (
                  <span className="ml-1 text-neutral-400">· {a.detail}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {opps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-neutral-400">关联机会：</span>
            {opps.map((o) => (
              <Link
                key={o.id}
                href={`/o/${o.id}`}
                className="rounded border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
              >
                {o.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

/** 推荐区：按目标价值矩阵推荐，带推荐理由 */
function RecommendSection({
  goal,
  recommendations,
}: {
  goal: Goal;
  recommendations: Recommendation[];
}) {
  return (
    <Card>
      <div className="border-b border-neutral-100 px-4 py-2.5">
        <h2 className="text-sm font-medium text-neutral-900">
          根据你的目标推荐 · {recommendReasonPrefix(goal)}
        </h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          经验参考，因校因专业而异
        </p>
      </div>
      <div className="px-4 py-3">
        {recommendations.length === 0 ? (
          <EmptyState title="暂无匹配推荐" description="去探索更多机会" />
        ) : (
          <div className="space-y-3">
            {recommendations.map((r) => (
              <RecommendItem key={r.id} rec={r} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function RecommendItem({ rec }: { rec: Recommendation }) {
  return (
    <Link
      href={`/o/${rec.id}`}
      className="block rounded-md border border-neutral-100 p-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">{rec.title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <TierBadge tier={rec.tier} />
          <span className="text-xs text-neutral-400">适配 {rec.fitScore}</span>
        </div>
      </div>
      {rec.summary && (
        <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{rec.summary}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-600">{rec.reason}</span>
      </div>
      {/* 因子展开（铁律②可解释，默认收起，hover/可点开看全貌） */}
      {rec.factors && rec.factors.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600">
            为什么推荐（{rec.factors.length} 个因子）
          </summary>
          <div className="mt-1.5 space-y-1">
            {rec.factors.map((f) => (
              <div
                key={f.name}
                className="flex items-start gap-2 rounded bg-neutral-50 px-2 py-1 text-xs"
              >
                <span
                  className={`shrink-0 font-medium ${
                    f.score > 0
                      ? "text-green-700"
                      : f.score < 0
                        ? "text-red-600"
                        : "text-neutral-500"
                  }`}
                >
                  {f.score > 0 ? "+" : ""}
                  {f.score}
                </span>
                <span className="text-neutral-600">{f.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      <div className="mt-2 flex items-center gap-2 border-t border-neutral-100 pt-1.5">
        <CredibilityBadge score={rec.credibilityScore} />
        <span className="text-xs text-neutral-400">信息可信度评分</span>
      </div>
    </Link>
  );
}

/** 价值分层徽章（与详情页一致，S 黑/A 蓝/B 灰） */
function TierBadge({ tier }: { tier: "S" | "A" | "B" }) {
  const styles: Record<"S" | "A" | "B", string> = {
    S: "bg-neutral-900 text-white",
    A: "bg-blue-600 text-white",
    B: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[tier]}`}
    >
      {tier} 级
    </span>
  );
}

void LEVEL_LABEL; // 预留（profile 未用 level）
