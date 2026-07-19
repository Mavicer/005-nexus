/**
 * CredibilityPanel — 可信度可视化（项目核心特色组件，业务级，建在 components/ 根而非 ui/）
 *
 * 护栏3：可信度是「评分体系」非真值裁决。UI 措辞「信息可信度评分」，禁用真实性/准确度。
 *
 * 三验证（与 credibility_score 同源，前端现场算，不查库不改 lib）：
 *   1. ✓ 官方来源验证：sources 中存在 OFFICIAL_SOURCE_TYPES 类型（official_doc/official_site/inst_notice/authority_list）
 *      —— 两态 ✓/✗
 *   2. ✓ 多源交叉验证：高权重来源（authorityWeight ≥ HIGH_WEIGHT_THRESHOLD=0.7）数量 ≥ 2
 *      —— 口径选 B（来源数不去重，与 computeConsistency 完全一致，避免 UI 与分数矛盾）
 *      —— 两态 ✓/✗（Agent B 第 13 条：官方/多源只用两态）
 *      —— 旁注说明：「多源交叉验证指 ≥2 个高权重独立来源」
 *   3. 最近更新：lastVerifiedAt 6 月内 ✓ / 6-12 月 ⚠️ / >12 月或超期 ✗
 *      —— 三态（仅此项三态，Agent B 第 13 条）
 *
 * 收紧1（Agent B 第 13 条）裁定：选 B（来源数不去重），与分数 computeConsistency 同口径。
 *   注：credibility.ts 的 computeConsistency 是"高权重来源数 ≥2 加分"，未按 sourceType 去重。
 *   选 B 让 UI 与分数完全一致，无需加额外说明行消除差异（仍保留通用说明行）。
 */
import { OFFICIAL_SOURCE_TYPES, SOURCE_TYPE_LABEL } from "@/lib/labels";
import { HIGH_WEIGHT_THRESHOLD } from "@/lib/source-weights";
import { getCredibilityTier } from "@/lib/design";
import type { CompetitionDetail } from "@/lib/competition";

type VerifyState = "yes" | "warn" | "no";

export function CredibilityPanel({ detail }: { detail: CompetitionDetail }) {
  const score = detail.credibilityScore;
  const tier = getCredibilityTier(score);
  const verifications = computeVerifications(detail);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {/* 分数 */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-neutral-500">信息可信度评分</span>
        {score ? (
          <span
            className="text-2xl font-semibold"
            style={{ color: tier?.color }}
          >
            {score}
          </span>
        ) : (
          <span className="text-sm text-neutral-400">未评估</span>
        )}
        {tier && (
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ backgroundColor: tier.bg, color: tier.color }}
          >
            {tier.label}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        基于来源权重·时效·多源一致性综合评估，仅供参考，非真实性裁决。
      </p>

      {/* 三验证 */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <VerifyItem label="官方来源验证" state={verifications.hasOfficial} />
        <VerifyItem label="多源交叉验证" state={verifications.crossVerified} />
        <VerifyItem label="最近更新" state={verifications.freshness} />
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        多源交叉验证指 ≥2 个高权重独立来源（权重 ≥ {HIGH_WEIGHT_THRESHOLD}）。
      </p>

      {/* 来源分层（R6 合规） */}
      <div className="mt-4 border-t border-neutral-100 pt-3">
        <p className="mb-2 text-xs text-neutral-500">信息来源（分层展示）</p>
        <SourceList detail={detail} />
      </div>
    </div>
  );
}

function VerifyItem({
  label,
  state,
}: {
  label: string;
  state: VerifyState;
}) {
  const icon = state === "yes" ? "✓" : state === "warn" ? "⚠️" : "✗";
  const color =
    state === "yes"
      ? "text-green-600"
      : state === "warn"
        ? "text-amber-600"
        : "text-neutral-400";
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className={color}>{icon}</span>
      <span className="text-neutral-600">{label}</span>
    </div>
  );
}

/** 来源分层：官方 / 学生经验(amber) / 其他 */
function SourceList({ detail }: { detail: CompetitionDetail }) {
  const official = detail.sources.filter((s) =>
    OFFICIAL_SOURCE_TYPES.has(s.sourceType),
  );
  const others = detail.sources.filter(
    (s) => !OFFICIAL_SOURCE_TYPES.has(s.sourceType),
  );
  const exps = detail.experiences;

  if (!official.length && !others.length && !exps.length) {
    return <p className="text-xs text-neutral-400">暂无来源</p>;
  }

  return (
    <div className="space-y-3">
      {official.length > 0 && (
        <ul className="space-y-1.5">
          {official.map((s) => (
            <SourceRow
              key={s.id}
              label={SOURCE_TYPE_LABEL[s.sourceType] ?? s.sourceType}
              title={s.title}
              url={s.url}
              primary={s.isPrimary}
            />
          ))}
        </ul>
      )}

      {exps.length > 0 && (
        <div className="rounded-md border border-amber-100 bg-amber-50/50 p-2.5">
          <p className="mb-1.5 text-xs font-medium text-amber-800">
            学生经验（仅供参考）
          </p>
          <ul className="space-y-2">
            {exps.map((e) => (
              <li key={e.id} className="text-xs text-neutral-700">
                <p className="leading-relaxed">{e.content}</p>
                <p className="mt-0.5 text-neutral-400">
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

      {others.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-neutral-400">其他来源</p>
          <ul className="space-y-1.5">
            {others.map((s) => (
              <SourceRow
                key={s.id}
                label={SOURCE_TYPE_LABEL[s.sourceType] ?? s.sourceType}
                title={s.title}
                url={s.url}
                primary={s.isPrimary}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SourceRow({
  label,
  title,
  url,
  primary,
}: {
  label: string;
  title: string | null;
  url: string | null;
  primary: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500">
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
        {primary && <span className="ml-1 text-neutral-400">·主来源</span>}
      </div>
    </li>
  );
}

// ---------- 三验证计算（同源） ----------

function computeVerifications(detail: CompetitionDetail): {
  hasOfficial: VerifyState;
  crossVerified: VerifyState;
  freshness: VerifyState;
} {
  const sources = detail.sources;

  // 1. 官方来源验证（两态）
  const hasOfficial = sources.some((s) =>
    OFFICIAL_SOURCE_TYPES.has(s.sourceType),
  )
    ? "yes"
    : "no";

  // 2. 多源交叉验证（选 B：高权重来源数 ≥2，不去重，与 computeConsistency 同口径）
  const highWeightCount = sources.filter(
    (s) => Number(s.authorityWeight) >= HIGH_WEIGHT_THRESHOLD,
  ).length;
  const crossVerified = highWeightCount >= 2 ? "yes" : "no";

  // 3. 最近更新（三态）
  const freshness = computeFreshnessState(detail);

  return { hasOfficial, crossVerified, freshness };
}

function computeFreshnessState(detail: CompetitionDetail): VerifyState {
  const now = new Date();
  // 超期优先
  if (detail.expireAt && detail.expireAt.getTime() < now.getTime()) {
    return "no";
  }
  if (!detail.lastVerifiedAt) return "no";
  const months = monthDiff(detail.lastVerifiedAt, now);
  if (months <= 6) return "yes";
  if (months <= 12) return "warn";
  return "no";
}

function monthDiff(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30);
}
