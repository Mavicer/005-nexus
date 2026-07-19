import { getCredibilityTier } from "@/lib/design";

/**
 * CredibilityBadge — 可信度徽章
 * 护栏3：措辞「信息可信度评分」，禁用真实性/准确度
 * 配色单源 design.ts（getCredibilityTier）
 */
export function CredibilityBadge({ score }: { score: string | null }) {
  const tier = getCredibilityTier(score);
  if (!tier) return null;
  const label = "信息可信度评分";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: tier.bg, color: tier.color }}
      title={`${label} ${score}（基于来源权重·时效·多源一致性综合评估）`}
    >
      {label} {score}
    </span>
  );
}
