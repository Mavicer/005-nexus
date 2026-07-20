/**
 * 机会价值分析（P5 任务2 + Phase A 升级，非 AI，复用 VALUE_MATRIX）
 *
 * 按 opportunity category 反查各 goal 的 tier + reason，
 * 给详情页「值不值得参加」展示。
 *
 * Phase A 升级（B 第 36 条疑点 2/3 拍板）：
 *  - 退役 stars，改用 tier（S/A/B）——与推荐列表一致，避免双轨（铁律②）。
 *  - getOpportunityValue(category) 返回 GoalValue[] 带 tier + reason。
 *  - ValueEntry 接口去 stars 留 tier + reason + majorReason。
 */
import type { Goal, InfoCategory, MajorDirection } from "@/db/schema-enums";
import { VALUE_MATRIX } from "@/lib/recommend";

export interface GoalValue {
  goal: Goal;
  goalLabel: string;
  tier: Tier | null; // null=不适用
  reason: string;
}

/** 价值分层（与 knowledge/opportunity-knowledge.ts 的 Tier 一致） */
export type Tier = "S" | "A" | "B";

const GOAL_LABELS: Record<Goal, string> = {
  baoyan: "保研",
  employment: "就业",
  civilService: "考公",
  abroad: "出国",
  entrepreneurship: "创业",
};

const ALL_GOALS: Goal[] = [
  "baoyan",
  "employment",
  "civilService",
  "abroad",
  "entrepreneurship",
];

/** tier → 星级展示（详情页 tier 徽章 + 辅助星，可选用） */
export function tierToStars(tier: Tier | null): 0 | 1 | 2 | 3 {
  switch (tier) {
    case "S":
      return 3;
    case "A":
      return 2;
    case "B":
      return 1;
    default:
      return 0;
  }
}

/**
 * 取某 category 对各 goal 的价值（反查 VALUE_MATRIX）
 * Phase A：tier 来自 VALUE_MATRIX entry 的 tier（退役 stars）。
 * 排序：高 tier 在前（S>A>B>不适用）。
 */
export function getOpportunityValue(category: InfoCategory): GoalValue[] {
  const tierRank: Record<Tier, number> = { S: 3, A: 2, B: 1 };
  const result: GoalValue[] = ALL_GOALS.map((goal) => {
    const entry = VALUE_MATRIX[goal]?.[category];
    return {
      goal,
      goalLabel: GOAL_LABELS[goal],
      tier: (entry?.tier ?? null) as Tier | null,
      reason: entry?.reason ?? "不适用",
    };
  });
  return result.sort((a, b) => {
    const ra = a.tier ? tierRank[a.tier] : 0;
    const rb = b.tier ? tierRank[b.tier] : 0;
    return rb - ra;
  });
}

/**
 * 匹配说明（结合用户画像 + 机会 category）
 * 规则模板生成「适合你」+ 原因，非 AI。
 * Phase A：用 tier 表达价值层次（无 AI/智能/精准）。
 */
export function getMatchReason(
  category: InfoCategory,
  profile: { goal: Goal | null; majorDirection?: MajorDirection | null } | null,
): { matched: boolean; reason: string | null } {
  if (!profile?.goal) return { matched: false, reason: null };
  const entry = VALUE_MATRIX[profile.goal]?.[category];
  if (!entry) {
    return {
      matched: false,
      reason: `${GOAL_LABELS[profile.goal]}目标下该类机会价值较低，仅供参考`,
    };
  }
  const majorReason = profile.majorDirection
    ? (entry.majorReason?.[profile.majorDirection] ?? null)
    : null;
  const reasonText = majorReason ?? entry.reason;
  return {
    matched: true,
    reason: `适合你：你目标${GOAL_LABELS[profile.goal]}，${reasonText}`,
  };
}
