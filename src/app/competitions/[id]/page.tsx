import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompetitionDetail } from "@/lib/competition";
import { CredibilityBadge, DeadlineTag, LevelTag } from "@/components/competition-card";

export const dynamic = "force-dynamic";

/**
 * 来源类型中文标签
 */
const SOURCE_TYPE_LABEL: Record<string, string> = {
  official_doc: "官方文件",
  inst_notice: "机构通知",
  authority_list: "权威榜单",
  official_site: "官方网站",
  student_exp: "学生经验",
  community: "社区内容",
};

/** 官方/权威来源（与 student_exp/community 分层展示，R6 合规） */
const OFFICIAL_SOURCE_TYPES = new Set([
  "official_doc",
  "inst_notice",
  "authority_list",
  "official_site",
]);

/**
 * 竞赛详情页（SSR）
 * 护栏3：可信度措辞「信息可信度评分」
 * 护栏6：来源分层展示，学生经验明确标注"仅供参考"
 */
export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCompetitionDetail(id);

  if (!detail) {
    notFound();
  }

  const c = detail.competition;
  const officialSources = detail.sources.filter((s) =>
    OFFICIAL_SOURCE_TYPES.has(s.sourceType),
  );
  const otherSources = detail.sources.filter(
    (s) => !OFFICIAL_SOURCE_TYPES.has(s.sourceType),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          ← 返回搜索
        </Link>
      </div>

      {/* 标题与标签 */}
      <header className="mb-8 border-b border-neutral-100 pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {c && <LevelTag level={c.level} />}
          <DeadlineTag date={c?.signUpEnd ?? null} />
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
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            {detail.summary}
          </p>
        )}
        <div className="mt-4">
          <CredibilityBadge score={detail.credibilityScore} />
        </div>
      </header>

      {c && (
        <>
          {/* 核心信息网格 */}
          <Section title="核心信息">
            <Grid>
              <Field label="主办方" value={c.organizer} />
              <Field label="认可度" value={recognitionLabel(c.recognition)} />
              <Field
                label="举办频率"
                value={frequencyLabel(c.frequency)}
              />
              {c.validYear && (
                <Field label="本届年度" value={String(c.validYear)} />
              )}
              <Field
                label="参赛形式"
                value={teamLabel(c.teamOrSolo)}
              />
              {c.teamSize && <Field label="队伍规模" value={c.teamSize} />}
              <Field
                label="难度"
                value={`${c.difficulty ?? "-"}/5`}
              />
              {c.effortEstimate && (
                <Field label="预计投入" value={c.effortEstimate} />
              )}
            </Grid>
          </Section>

          {/* 时间节点 */}
          <Section title="时间节点">
            <Grid>
              <Field
                label="报名开始"
                value={fmtDate(c.signUpStart)}
              />
              <Field
                label="报名截止"
                value={fmtDate(c.signUpEnd)}
              />
              <Field
                label="出结果"
                value={fmtDate(c.resultDate)}
              />
            </Grid>
          </Section>

          {/* 适合人群 */}
          <Section title="适合人群">
            <Grid>
              {c.suitableGrades && c.suitableGrades.length > 0 && (
                <Field label="适合年级" value={c.suitableGrades.join("、")} />
              )}
              {c.suitableMajors && c.suitableMajors.length > 0 && (
                <Field label="适合学科" value={c.suitableMajors.join("、")} />
              )}
              {c.prereq && <Field label="基础要求" value={c.prereq} />}
            </Grid>
          </Section>

          {/* 价值评估 */}
          {(c.valueTags?.length || c.helps?.length) ? (
            <Section title="价值评估">
              <Grid>
                {c.valueTags && c.valueTags.length > 0 && (
                  <Field label="加分项" value={c.valueTags.join("、")} />
                )}
                {c.helps && c.helps.length > 0 && (
                  <Field label="有助于" value={c.helps.join("、")} />
                )}
              </Grid>
            </Section>
          ) : null}

          {/* 轮次时间线 */}
          {detail.rounds.length > 0 && (
            <Section title="赛程轮次">
              <ol className="space-y-3">
                {detail.rounds.map((r) => (
                  <li key={r.id} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-neutral-300" />
                    <div>
                      <p className="text-sm font-medium text-neutral-800">
                        {r.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {[fmtDate(r.startAt), fmtDate(r.endAt)]
                          .filter(Boolean)
                          .join(" — ") || "时间待定"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </>
      )}

      {/* 来源分层展示（R6 合规） */}
      <Section title="信息来源">
        <p className="mb-3 text-xs text-neutral-400">
          官方与权威来源为主依据；学生经验仅供参考，与官方信息分层展示。
        </p>
        <ul className="space-y-2">
          {officialSources.map((s) => (
            <SourceItem
              key={s.id}
              label={SOURCE_TYPE_LABEL[s.sourceType] ?? s.sourceType}
              title={s.title}
              url={s.url}
              isPrimary={s.isPrimary}
            />
          ))}
        </ul>

        {detail.experiences.length > 0 && (
          <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-amber-800">
              学生经验（仅供参考）
            </h3>
            <ul className="space-y-3">
              {detail.experiences.map((e) => (
                <li key={e.id} className="text-sm text-neutral-700">
                  <p className="leading-relaxed">{e.content}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    — {e.author ?? "匿名"}
                    {e.sourceUrl && (
                      <>
                        {" · "}
                        <a
                          href={e.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-500 underline"
                        >
                          来源
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {otherSources.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-neutral-400">其他来源</p>
            <ul className="space-y-2">
              {otherSources.map((s) => (
                <SourceItem
                  key={s.id}
                  label={SOURCE_TYPE_LABEL[s.sourceType] ?? s.sourceType}
                  title={s.title}
                  url={s.url}
                  isPrimary={s.isPrimary}
                />
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* 官网入口 */}
      {c?.officialUrl && (
        <div className="mt-8">
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

      <footer className="mt-12 border-t border-neutral-100 pt-4 text-xs text-neutral-400">
        最后更新：{fmtDate(detail.lastUpdatedAt)} ·
        最后核验：{fmtDate(detail.lastVerifiedAt) ?? "—"}
      </footer>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-800">{value}</dd>
    </div>
  );
}

function SourceItem({
  label,
  title,
  url,
  isPrimary,
}: {
  label: string;
  title: string | null;
  url: string | null;
  isPrimary: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="inline-flex shrink-0 items-center rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
        {label}
      </span>
      <div className="min-w-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-700 underline hover:text-neutral-900"
          >
            {title ?? url}
          </a>
        ) : (
          <span className="text-neutral-700">{title ?? "未命名来源"}</span>
        )}
        {isPrimary && (
          <span className="ml-2 text-xs text-neutral-400">主来源</span>
        )}
      </div>
    </li>
  );
}

function fmtDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("zh-CN");
}

function recognitionLabel(v: string | null): string | null {
  if (!v) return null;
  return (
    { official_A: "A 类（官方认定）", leaderboard_listed: "榜单收录", normal: "普通" } as Record<string, string>
  )[v] ?? v;
}

function frequencyLabel(v: string | null): string | null {
  if (!v) return null;
  return (
    {
      annual: "每年一届",
      biennial: "两年一届",
      irregular: "不定期",
      once: "一次性",
    } as Record<string, string>
  )[v] ?? v;
}

function teamLabel(v: string | null): string | null {
  if (!v) return null;
  return (
    { team: "组队", solo: "个人", both: "组队/个人均可" } as Record<string, string>
  )[v] ?? v;
}
