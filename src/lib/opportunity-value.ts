/**
 * 机会价值分析（P5 任务2，非 AI，复用 VALUE_MATRIX）
 *
 * 按 opportunity category 反查各 goal 的 stars + reason，
 * 给详情页「值不值得参加」展示。
 */
import type { Goal, InfoCategory } from "@/db/schema-enums";
import { VALUE_MATRIX } from "@/lib/recommend";

export interface GoalValue {
  goal: Goal;
  goalLabel: string;
  stars: 0 | 1 | 2 | 3; // 0=不适用
  reason: string;
}

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

/**
 * 取某 category 对各 goal 的价值（反查 VALUE_MATRIX）
 * 排序：高星级在前，不适用(0)在后
 */
export function getOpportunityValue(category: InfoCategory): GoalValue[] {
  const result: GoalValue[] = ALL_GOALS.map((goal) => {
    const entry = VALUE_MATRIX[goal]?.[category];
    return {
      goal,
      goalLabel: GOAL_LABELS[goal],
      stars: (entry?.stars ?? 0) as 0 | 1 | 2 | 3,
      reason: entry?.reason ?? "不适用",
    };
  });
  return result.sort((a, b) => b.stars - a.stars);
}

/**
 * 匹配说明（结合用户画像 + 机会 category）
 * 规则模板生成「适合你」+ 原因，非 AI。
 */
export function getMatchReason(
  category: InfoCategory,
  profile: { goal: Goal | null } | null,
): { matched: boolean; reason: string | null } {
  if (!profile?.goal) return { matched: false, reason: null };
  const entry = VALUE_MATRIX[profile.goal]?.[category];
  if (!entry) {
    return {
      matched: false,
      reason: `${GOAL_LABELS[profile.goal]}目标下该类机会价值较低，仅供参考`,
    };
  }
  return {
    matched: true,
    reason: `适合你：你目标${GOAL_LABELS[profile.goal]}，${entry.reason}`,
  };
}
