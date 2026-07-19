import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompetitionDetail } from "@/lib/competition";
import { getCurrentUser } from "@/lib/auth";
import { isFavorited } from "@/lib/favorites";
import {
  LEVEL_LABEL,
  RECOGNITION_LABEL,
  FREQUENCY_LABEL,
  TEAM_LABEL,
} from "@/lib/labels";
import { CredibilityBadge, DeadlineTag } from "@/components/competition-card";
import { CredibilityPanel } from "@/components/credibility-panel";
import { FavoriteButton } from "@/components/favorite-button";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Rating } from "@/components/ui/rating";
import { Timeline } from "@/components/ui/timeline";

export const dynamic = "force-dynamic";

/**
 * 竞赛详情页（产品化重塑，7 区块）
 * 护栏2：复用 getCompetitionDetail()，不写 SQL；不改 lib/competition
 * 护栏3：可信度措辞「信息可信度评分」，三验证同源
 * 信息密度优先：紧凑 2-3 列网格，非大留白
 */
export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCompetitionDetail(id);
  if (!detail) notFound();

  const c = detail.competition;
  const user = await getCurrentUser();
  const favorited = user ? await isFavorited(user.userId, id) : false;

  const deadlineState = detail.expireAt ?? c?.signUpEnd ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4">
        <Link
          href="/explore"
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          ← 返回探索
        </Link>
      </div>

      {/* 区块 1：Header */}
      <section className="mb-6 border-b border-neutral-100 pb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {c?.level && (
            <Tag variant="neutral">
              {LEVEL_LABEL[c.level] ?? c.level}
            </Tag>
          )}
          {c?.recognition && (
            <Tag variant="neutral">
              {RECOGNITION_LABEL[c.recognition] ?? c.recognition}
            </Tag>
          )}
          <DeadlineTag date={deadlineState} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {detail.title}
        </h1>
        {detail.aliases && detail.aliases.length > 0 && (
          <p className="mt-1 text-sm text-neutral-400">
            别名：{detail.aliases.join("、")}
          </p>
        )}
        {detail.summary && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            {detail.summary}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CredibilityBadge score={detail.credibilityScore} />
          <FavoriteButton infoItemId={detail.id} initialFavorited={favorited} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {c && (
            <>
              {/* 区块 2：概览 */}
              <Card>
                <div className="border-b border-neutral-100 px-4 py-2.5">
                  <h2 className="text-sm font-medium text-neutral-900">概览</h2>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3">
                  <Field label="主办方" value={c.organizer} />
                  <Field
                    label="举办频率"
                    value={FREQUENCY_LABEL[c.frequency ?? ""] ?? c.frequency}
                  />
                  {c.validYear && (
                    <Field label="本届年度" value={String(c.validYear)} />
                  )}
                  <Field
                    label="难度"
                    value={
                      c.difficulty != null ? (
                        <Rating value={c.difficulty} />
                      ) : null
                    }
                  />
                  <Field label="预计投入" value={c.effortEstimate} />
                  <Field
                    label="参赛形式"
                    value={TEAM_LABEL[c.teamOrSolo ?? ""] ?? c.teamOrSolo}
                  />
                </div>
              </Card>

              {/* 区块 3：适合人群 */}
              <Card>
                <div className="border-b border-neutral-100 px-4 py-2.5">
                  <h2 className="text-sm font-medium text-neutral-900">适合人群</h2>
                </div>
                <div className="space-y-3 px-4 py-3">
                  {c.suitableGrades && c.suitableGrades.length > 0 && (
                    <FieldRow label="适合年级">
                      <div className="flex flex-wrap gap-1.5">
                        {c.suitableGrades.map((g) => (
                          <Tag key={g} variant="blue">{g}</Tag>
                        ))}
                      </div>
                    </FieldRow>
                  )}
                  {c.suitableMajors && c.suitableMajors.length > 0 && (
                    <FieldRow label="适合学科">
                      <div className="flex flex-wrap gap-1.5">
                        {c.suitableMajors.map((m) => (
                          <Tag key={m} variant="neutral">{m}</Tag>
                        ))}
                      </div>
                    </FieldRow>
                  )}
                  {c.prereq && <FieldRow label="基础要求" value={c.prereq} />}
                </div>
              </Card>

              {/* 区块 4：价值分析 */}
              {(c.helps?.length || c.valueTags?.length) ? (
                <Card>
                  <div className="border-b border-neutral-100 px-4 py-2.5">
                    <h2 className="text-sm font-medium text-neutral-900">价值分析</h2>
                  </div>
                  <div className="space-y-3 px-4 py-3">
                    {c.helps && c.helps.length > 0 && (
                      <FieldRow label="有助于">
                        <div className="flex flex-wrap gap-1.5">
                          {c.helps.map((h) => (
                            <Tag key={h} variant="green">{h}</Tag>
                          ))}
                        </div>
                      </FieldRow>
                    )}
                    {c.valueTags && c.valueTags.length > 0 && (
                      <FieldRow label="加分项">
                        <div className="flex flex-wrap gap-1.5">
                          {c.valueTags.map((v) => (
                            <Tag key={v} variant="amber">{v}</Tag>
                          ))}
                        </div>
                      </FieldRow>
                    )}
                  </div>
                </Card>
              ) : null}

              {/* 区块 5：报名流程（rounds Timeline） */}
              {detail.rounds.length > 0 && (
                <Card>
                  <div className="border-b border-neutral-100 px-4 py-2.5">
                    <h2 className="text-sm font-medium text-neutral-900">报名流程</h2>
                  </div>
                  <div className="px-4 py-3">
                    <Timeline
                      items={detail.rounds.map((r) => ({
                        id: r.id,
                        name: r.name,
                        startAt: r.startAt,
                        endAt: r.endAt,
                      }))}
                    />
                    {(c.signUpEnd || c.resultDate) && (
                      <div className="mt-3 flex flex-wrap gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                        {c.signUpEnd && (
                          <span>
                            报名截止：<span className="text-neutral-800">{fmt(c.signUpEnd)}</span>
                          </span>
                        )}
                        {c.resultDate && (
                          <span>
                            出结果：<span className="text-neutral-800">{fmt(c.resultDate)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* 区块 6：准备路线（现有字段重组，零新增） */}
              <Card>
                <div className="border-b border-neutral-100 px-4 py-2.5">
                  <h2 className="text-sm font-medium text-neutral-900">准备路线</h2>
                </div>
                <div className="px-4 py-3">
                  <PreparationSteps
                    prereq={c.prereq}
                    difficulty={c.difficulty}
                    effortEstimate={c.effortEstimate}
                    signUpEnd={c.signUpEnd}
                  />
                </div>
              </Card>
            </>
          )}

          {/* 官网入口 */}
          {c?.officialUrl && (
            <div>
              <a
                href={c.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                前往官网报名 →
              </a>
            </div>
          )}
        </div>

        {/* 区块 7：可信度可视化（侧栏，核心特色） */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <CredibilityPanel detail={detail} />
            <footer className="mt-4 text-xs text-neutral-400">
              最后更新：{fmt(detail.lastUpdatedAt)} ·
              最后核验：{fmt(detail.lastVerifiedAt) ?? "—"}
            </footer>
          </div>
        </aside>
      </div>
    </main>
  );
}

// ---------- 准备路线步骤（规则化模板，非 AI） ----------

function PreparationSteps({
  prereq,
  difficulty,
  effortEstimate,
  signUpEnd,
}: {
  prereq?: string | null;
  difficulty?: number | null;
  effortEstimate?: string | null;
  signUpEnd?: Date | null;
}) {
  const steps: { title: string; content: React.ReactNode }[] = [];
  if (prereq) steps.push({ title: "① 基础要求", content: prereq });
  if (difficulty != null) {
    steps.push({
      title: "② 难度评估",
      content: <Rating value={difficulty} />,
    });
  }
  if (effortEstimate) {
    steps.push({ title: "③ 预计投入", content: effortEstimate });
  }
  // 规则化建议（护栏：非 AI、非随机；无 signUpEnd 不显示）
  if (signUpEnd) {
    const days = Math.ceil(
      (signUpEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days > 0) {
      const suggestWeeks = Math.max(2, Math.ceil((difficulty ?? 3) * 3));
      steps.push({
        title: "④ 建议",
        content: `距报名截止 ${days} 天，建议提前约 ${suggestWeeks} 周开始准备。`,
      });
    }
  }

  if (!steps.length) {
    return <p className="text-xs text-neutral-400">暂无准备路线信息</p>;
  }

  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="font-medium text-neutral-900">{s.title}</span>
          <span className="text-neutral-600">{s.content}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------- 通用字段 ----------

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null | React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-800">{value}</dd>
    </div>
  );
}

function FieldRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <span className="shrink-0 text-xs text-neutral-400">{label}</span>
      <div className="text-sm text-neutral-700">{value ?? children}</div>
    </div>
  );
}

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("zh-CN");
}
