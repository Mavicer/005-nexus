/**
 * 决策引擎 — 7 步推理链（Phase A 4.3 向量版重做）
 *
 * decide(profile, candidates): DecisionResult[]
 *   步骤1 成长阶段判断（grade → stage：探索/建设/冲刺/收尾）
 *   步骤2 目标分析（goal → 核心维度，取该 goal 下高价值 category）
 *   步骤3 专业方向价值判断（classifyMajor(majorText) → 专业向量，循环外算一次）
 *   步骤4 机会价值评估：每候选 inferSubtype(category, title) → 机会向量 → majorMatchWithVector
 *           注入向量点积 majorMatch；gradeFit/roi 仍查 knowledge（stageRole/cost/outcome 通用）
 *   步骤5 时间适配判断（grade × stageRole → gradeFit，已查）
 *   步骤6 推序（fitScore = 6 因子求和，降序）
 *   步骤7 解释原因（factors → reason 文本，非静态模板）
 *
 * 4.3 关键改动（取代枚举版）：
 *   - majorMatch 改向量点积（majorMatchWithVector），任意专业可算，不靠枚举不靠特调（owner 铁律①③⑨）。
 *   - 步骤3 classifyMajor 循环外算一次专业向量（不每候选重复算）。
 *   - gradeFit/roi 仍查 knowledge（stageRole/cost/outcome 通用维度，不随专业变）。
 *   - tier 取 majorMatch dominantAxis 对应的量级（高≥20=S/中10-19=A/低<10=B）。
 *
 * 候选来源：上层（recommend.ts 第七步重构时）调 searchItems 取候选传入，engine 不写裸 SQL（护栏2）。
 * 护栏：fitScore 可解释可追溯（铁律②）；不引 AI；文案禁 AI/智能/精准；反特调（禁止画像专属规则）。
 */
import type { Goal, GoalGrade, InfoCategory } from "@/db/schema-enums";
import { VALUE_MATRIX } from "@/lib/recommend";
import {
  queryKnowledge,
  inferSubtype,
  type OpportunityKnowledge,
  type OpportunitySubtype,
} from "@/lib/knowledge/opportunity-knowledge";
import { classifyMajor, type MajorVector } from "@/lib/knowledge/major-vector";
import {
  goalMatch,
  majorMatchWithVector,
  gradeFitWithKnowledge,
  schoolFit,
  roiWithKnowledge,
  timeConflict,
  readinessGapWithSubtype,
  type Factor,
  type DecisionProfile,
  type DecisionOpportunity,
} from "./factors";

/** 7 步中的成长阶段（步骤1，从 grade 派生） */
export type GrowthStage = "探索" | "建设" | "冲刺" | "收尾";

/** 决策结果（步骤6/7 产出，UI 只渲染不判断，铁律⑧） */
export interface DecisionResult {
  /** 推荐项（机会基础信息） */
  recommendation: DecisionOpportunity;
  /** 7 因子三元组（铁律②可解释，4.5 加 readinessGap） */
  factors: Factor[];
  /** 适配度总分（7 因子求和，非黑盒） */
  fitScore: number;
  /** 价值分层（按 majorMatch 量级：≥20=S/10-19=A/<10=B） */
  tier: "S" | "A" | "B";
  /** 排名（1-based，按 fitScore 降序） */
  rank: number;
  /** 步骤1 派生的成长阶段 */
  growthStage: GrowthStage;
  /** 步骤7 生成的个性化原因（从 factors 拼接，非静态模板） */
  reason: string;
}

// ============================================================
// 步骤1：成长阶段判断（grade → stage）
// ============================================================

/** grade → 成长阶段（步骤1） */
export function judgeGrowthStage(grade: GoalGrade | null): GrowthStage | null {
  switch (grade) {
    case "freshman":
      return "探索";
    case "sophomore":
      return "建设";
    case "junior":
      return "冲刺";
    case "senior":
      return "收尾";
    default:
      return null;
  }
}

// ============================================================
// 步骤2：目标分析（goal → 核心维度，取该 goal 下高价值 category）
// ============================================================

/**
 * 步骤2：取 goal 下高价值 category（按 tier 降序），供上层取候选。
 * 返回 [category, tier][]，tier 从 VALUE_MATRIX[goal] 取。
 */
export function analyzeGoal(goal: Goal): { category: InfoCategory; tier: "S" | "A" | "B" }[] {
  const matrix = VALUE_MATRIX[goal];
  if (!matrix) return [];
  const tierRank: Record<"S" | "A" | "B", number> = { S: 3, A: 2, B: 1 };
  return Object.entries(matrix)
    .map(([cat, entry]) => ({
      category: cat as InfoCategory,
      tier: (entry as { tier: "S" | "A" | "B" }).tier,
    }))
    .sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);
}

// ============================================================
// 步骤3+4：机会价值评估（向量点积版）
// ============================================================

/**
 * 步骤3+4：对单个机会，用 engine 预算的专业向量 + inferSubtype 得 subtype 取机会向量，
 * 组装 7 因子（majorMatch 向量点积注入；gradeFit/roi 注入 knowledge；readinessGap 注入 subtype）。
 *
 * 4.3 关键：majorMatch 走 majorMatchWithVector（向量点积，任意专业可算）。
 *           gradeFit/roi 走 knowledge（stageRole/cost/outcome 通用维度）。
 * 4.5 第2小步：readinessGap 第7因子（能力 vs 门槛三态）。
 *           行为推断重复 subtype 降权（behavior-inference 算，engine dedup）。
 *
 * 返回 7 因子 + knowledge + subtype（供步骤7 生成 reason）。
 */
function evaluateOpportunity(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
  majorVec: MajorVector,
  now: Date,
): { factors: Factor[]; knowledge: OpportunityKnowledge | null; subtype: OpportunitySubtype } {
  // 步骤4a：inferSubtype 得 subtype（选机会向量用）
  const subtype = inferSubtype(opp.category, opp.title);
  // 步骤4b：查 knowledge（gradeFit/roi 用，stageRole/cost/outcome 通用）
  const knowledge = queryKnowledge({
    goal: profile.goal,
    majorDirection: profile.majorDirection,
    grade: profile.grade,
    category: opp.category,
    subtype,
  });

  // 组装 7 因子
  const gm = goalMatch(profile.goal, opp);
  if (!gm) {
    // 该 category 对此 goal 不适用 → 不进候选（上层 analyzeGoal 已过滤，此处兜底）
    return { factors: [], knowledge: null, subtype };
  }
  // majorMatch：向量点积注入（4.3 核心，取代枚举 tier）
  const mm = majorMatchWithVector(majorVec, opp);
  // gradeFit/roi：注入 knowledge（stageRole/cost/outcome 通用维度）
  const gf = gradeFitWithKnowledge(profile, opp, knowledge);
  const sf = schoolFit(profile, opp);
  const r = roiWithKnowledge(profile, opp, knowledge);
  const tc = timeConflict(opp, now);
  // readinessGap：能力 vs 门槛三态（4.5 第2小步，注入 subtype）
  let rg = readinessGapWithSubtype(profile, subtype);
  // 行为推断重复 subtype 降权（U3 数模：已达门槛但同类重复 → 额外 -5 提示升级）
  if (profile.repeatedSubtypes?.includes(subtype)) {
    rg = {
      ...rg,
      score: rg.score - 5,
      reason: `${rg.reason}；你已有关注此类机会，重复投入建议升级`,
      source: `${rg.source}+behavior-inference:重复`,
    };
  }

  return {
    factors: [gm, mm, gf, sf, r, tc, rg],
    knowledge,
    subtype,
  };
}

// ============================================================
// 步骤6+7：推序 + 解释原因
// ============================================================

/**
 * 步骤7：从 factors 生成个性化原因（非静态模板，铁律①）。
 * 取最高正因子 + 关键负因子（如有）拼接，措辞合规（无 AI/智能/精准）。
 */
function explainReason(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
  factors: Factor[],
  knowledge: OpportunityKnowledge | null,
  growthStage: GrowthStage | null,
): string {
  const positive = factors
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
  const negative = factors.filter((f) => f.score < 0).sort((a, b) => a.score - b.score);

  const top = positive[0];
  const neg = negative[0];

  const profileDesc = [profile.schoolTier ?? "", profile.grade ?? ""]
    .filter(Boolean)
    .join("·");

  const parts: string[] = [];
  if (top) {
    parts.push(`${top.name} ${top.score}：${top.reason}`);
  }
  if (neg) {
    parts.push(`${neg.name} ${neg.score}：${neg.reason}`);
  }
  const knowledgeReason = knowledge?.reason;
  const stageHint = growthStage ? `当前处于${growthStage}阶段` : "";

  const tail = [knowledgeReason, stageHint].filter(Boolean).join("；");
  const body = parts.join("；");
  const head = profileDesc ? `根据你的画像（${profileDesc}）` : "根据你的画像";

  return [head, body, tail].filter(Boolean).join("，") + "。";
}

// ============================================================
// 主入口：decide() — 7 步推理链
// ============================================================

/**
 * 决策引擎主入口（7 步推理链，向量版）。
 *
 * @param profile 用户画像（goal/schoolTier/majorDirection/grade/majorText）
 * @param candidates 候选机会（上层用 searchItems 取，护栏2，engine 不写裸 SQL）
 * @param now 当前时间（可注入便于测试）
 * @returns DecisionResult[] 按 fitScore 降序，rank 1-based
 */
export async function decide(
  profile: DecisionProfile,
  candidates: DecisionOpportunity[],
  now: Date = new Date(),
): Promise<DecisionResult[]> {
  // 步骤1：成长阶段判断
  const growthStage = judgeGrowthStage(profile.grade);

  // 步骤3：classifyMajor 循环外算一次专业向量（不每候选重复算）
  const majorVec = classifyMajor(profile.majorText ?? null).vector;

  // 步骤2-5：逐候选评估
  const evaluated = candidates.map((opp) => {
    const { factors, knowledge } = evaluateOpportunity(profile, opp, majorVec, now);
    if (factors.length === 0) return null; // goalMatch 不适用，跳过

    // 步骤6：fitScore = 6 因子求和（timeConflict 在 factors 内已是负值，直接求和）
    const fitScore = factors.reduce((sum, f) => sum + f.score, 0);

    // tier：按 majorMatch 量级（向量版无 knowledge tier，用 majorMatch score 量级分层）
    const tier = extractTierFromFactors(factors);

    return {
      recommendation: opp,
      factors,
      fitScore,
      tier,
      knowledge,
      growthStage,
    };
  });

  // 步骤6：推序（fitScore 降序，已截止 timeConflict=-100 自然沉底）
  const sorted = evaluated
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.fitScore - a.fitScore);

  // 步骤7：解释原因 + 赋 rank
  return sorted.map((r, i) => ({
    recommendation: r.recommendation,
    factors: r.factors,
    fitScore: r.fitScore,
    tier: r.tier,
    rank: i + 1,
    growthStage: r.growthStage ?? "探索",
    reason: explainReason(
      profile,
      r.recommendation,
      r.factors,
      r.knowledge,
      r.growthStage,
    ),
  }));
}

/**
 * 从 factors 提取 tier（向量版：按 majorMatch 量级分层）。
 * majorMatch ≥20 = S / 10-19 = A / <10 = B（与枚举版量级一致，4.2 量级对照表验证）。
 * majorMatch 为 0（goalMatch 不适用已跳过，不会到这）时按 goalMatch tier 兜底。
 */
function extractTierFromFactors(factors: Factor[]): "S" | "A" | "B" {
  const mm = factors.find((f) => f.name === "majorMatch");
  if (mm) {
    if (mm.score >= 20) return "S";
    if (mm.score >= 10) return "A";
    return "B";
  }
  // 兜底：按 goalMatch tier
  const gm = factors.find((f) => f.name === "goalMatch");
  if (!gm) return "B";
  if (gm.score >= 30) return "S";
  if (gm.score >= 15) return "A";
  return "B";
}
