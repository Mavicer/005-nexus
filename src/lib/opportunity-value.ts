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
 *
 * Phase A 4.2 升级（B 第 46 条）：
 *  - getMatchReason 从读 entry.majorReason（枚举特调，作废）→ 改用
 *    classifyMajor + 向量点积生成匹配说明（取 dominantAxis + 两向量该轴值，任意专业可算）。
 */
import type { Goal, InfoCategory, MajorDirection } from "@/db/schema-enums";
import { VALUE_MATRIX } from "@/lib/recommend";
import {
  classifyMajor,
  majorMatchScore,
  getOpportunityVector,
} from "@/lib/knowledge/major-vector";
import { inferSubtype } from "@/lib/knowledge/opportunity-knowledge";

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
 * 匹配说明（结合用户画像 + 机会）
 * Phase A 4.2：用 classifyMajor + 向量点积生成（取代枚举 majorReason，任意专业可算）。
 * 取 dominantAxis（点积贡献最大轴）+ 两向量该轴值拼文本，措辞合规（非 AI，无智能/精准）。
 *
 * @param category 机会类别
 * @param profile 用户画像（需 major 文本做向量归一）
 * @param oppTitle 机会标题（inferSubtype 推断 subtype 用）
 */
export function getMatchReason(
  category: InfoCategory,
  profile: { goal: Goal | null; major?: string | null; majorDirection?: MajorDirection | null } | null,
  oppTitle?: string,
): { matched: boolean; reason: string | null } {
  if (!profile?.goal) return { matched: false, reason: null };

  // goal 维度：该机会对 goal 有价值否（VALUE_MATRIX）
  const entry = VALUE_MATRIX[profile.goal]?.[category];
  if (!entry) {
    return {
      matched: false,
      reason: `${GOAL_LABELS[profile.goal]}目标下该类机会价值较低，仅供参考`,
    };
  }

  // 专业向量 × 机会向量点积（任意专业可算，不靠枚举）
  const majorVec = classifyMajor(profile.major ?? null).vector;
  const subtype = inferSubtype(category, oppTitle ?? "");
  const oppVec = getOpportunityVector(subtype);
  const match = majorMatchScore(majorVec, oppVec);

  return {
    matched: true,
    reason: `适合你：你目标${GOAL_LABELS[profile.goal]}，${match.reason}`,
  };
}
