/**
 * 硬约束规则库 TS 镜像（Phase A 4.6.2，hardConstraintPressure 第8因子）
 *
 * ⚠️ 镜像自 `知识库-成长模型/10-硬约束规则库.md`（真理源）。
 *    改规则 = 改 md + 本 TS 同步。
 *
 * type 分派非 if 硬编码（nit-20）：HARD_CONSTRAINT_RULES[type].pressureFunction，
 * 新增 type 只加规则不改代码。
 *
 * source 强约束：只 user_declared 进 priority（api 校验已拒绝 system_inferred）。
 * 护栏：不引 AI；pressure 0-1 定性压力值非分数线；UI 透明归因用户输入。
 */
import type { Goal, HardConstraint } from "@/db/schema-enums";
import type { DecisionProfile } from "@/lib/decision/factors";

/** 紧迫度 */
export type Urgency = "紧急" | "中" | "低";
/** 影响度 */
export type Impact = "高" | "中" | "低";

/** 硬约束规则（镜像 10-md） */
export interface HardConstraintRule {
  type: HardConstraint["type"];
  /** 压力函数：f(当前能力, 目标值, deadline, now, profile) → pressure 0-1 */
  pressureFunction: (
    current: string | null,
    target: string,
    deadline: string | null,
    _now: Date,
    _profile: DecisionProfile,
  ) => number;
  /** 紧迫度规则 */
  urgencyRule: (deadline: string | null, now: Date) => Urgency;
  /** 影响规则 */
  impactRule: (goal: Goal) => Impact;
}

// ============================================================
// 通用 deadline → 剩余月数
// ============================================================

/** deadline 标识 → 距 now 的剩余月数（经验映射） */
function deadlineToMonthsRemaining(deadline: string | null, _now: Date): number | null {
  if (!deadline) return null;
  // deadline 是阶段标识（sophomore_end 等），按当前 grade 经验估算剩余月数
  // 简化：按 deadline 关键词估
  if (deadline.includes("sophomore_end")) return 12; // 大二结束 ~12月后（经验）
  if (deadline.includes("junior_end")) return 6;
  if (deadline.includes("senior_end")) return 0;
  if (deadline.includes("3month") || deadline.includes("3月")) return 3;
  if (deadline.includes("6month") || deadline.includes("6月")) return 6;
  return 6; // 默认 6 月
}

/** 通用 urgencyRule（按剩余月数） */
function defaultUrgencyRule(deadline: string | null, now: Date): Urgency {
  const months = deadlineToMonthsRemaining(deadline, now);
  if (months === null) return "低";
  if (months <= 3) return "紧急";
  if (months <= 6) return "中";
  return "低";
}

// ============================================================
// 5 类硬约束规则（镜像 10-md §2）
// ============================================================

const languageRule: HardConstraintRule = {
  type: "language_requirement",
  pressureFunction: (current, target, deadline, now) => {
    // current=englishLevel(none/cet/ielts_toefl), target=ielts_6.5 等
    const order = ["none", "cet", "ielts_toefl"];
    const curIdx = current ? order.indexOf(current) : -1;
    // target 含 ielts/toefl 视为 ielts_toefl 档
    const targetIdx = /ielts|toefl/i.test(target) ? 2 : /cet/i.test(target) ? 1 : 0;
    if (curIdx < 0) return 0.9; // 未填能力，假设差距大（保守压力）
    const diff = targetIdx - curIdx;
    let pressure = 0;
    if (diff >= 2) pressure = 0.9;
    else if (diff === 1) pressure = 0.6;
    else pressure = 0.2; // 达标
    // 叠加 urgency：剩余少加压
    const months = deadlineToMonthsRemaining(deadline, now);
    if (months !== null && months <= 3) pressure *= 1.3;
    return Math.min(pressure, 1);
  },
  urgencyRule: defaultUrgencyRule,
  impactRule: (goal) => {
    if (goal === "abroad") return "高";
    if (goal === "baoyan") return "中";
    return "低";
  },
};

const gpaRule: HardConstraintRule = {
  type: "gpa_requirement",
  pressureFunction: (current, target, _deadline, _now, _profile) => {
    // current=gpaTier(below/top50/top20/top5)
    const order = ["below", "top50", "top20", "top5"];
    const curIdx = current ? order.indexOf(current) : -1;
    const targetIdx = /top5/i.test(target) ? 3 : /top20/i.test(target) ? 2 : /top50/i.test(target) ? 1 : 0;
    if (curIdx < 0) return 0.9;
    const diff = targetIdx - curIdx;
    if (diff >= 2) return 0.9;
    if (diff === 1) return 0.6;
    return 0.2;
  },
  urgencyRule: (deadline, now) => {
    // 大三+未达 → 紧急（保研窗口收窄）
    const months = deadlineToMonthsRemaining(deadline, now);
    if (months !== null && months <= 6) return "紧急";
    return defaultUrgencyRule(deadline, now);
  },
  impactRule: (goal) => {
    if (goal === "baoyan") return "高";
    return "低";
  },
};

const internshipRule: HardConstraintRule = {
  type: "internship_requirement",
  pressureFunction: (current, _target, deadline, now) => {
    // current=internshipLevel(none/has)
    const has = current === "has";
    if (has) return 0.2;
    // none + 春招季
    const months = deadlineToMonthsRemaining(deadline, now);
    if (months !== null && months <= 3) return 0.9;
    return 0.6;
  },
  urgencyRule: defaultUrgencyRule,
  impactRule: (goal) => {
    if (goal === "employment") return "高";
    return "低";
  },
};

const certificateRule: HardConstraintRule = {
  type: "certificate",
  pressureFunction: (_current, _target, deadline, now) => {
    const months = deadlineToMonthsRemaining(deadline, now);
    if (months !== null && months <= 3) return 0.9;
    if (months !== null && months <= 6) return 0.6;
    return 0.3;
  },
  urgencyRule: defaultUrgencyRule,
  impactRule: () => "中",
};

const personalPlanRule: HardConstraintRule = {
  type: "personal_plan",
  pressureFunction: (_current, _target, deadline, now) => {
    const months = deadlineToMonthsRemaining(deadline, now);
    if (months !== null && months <= 3) return 0.9;
    if (months !== null && months <= 6) return 0.6;
    return 0.3;
  },
  urgencyRule: defaultUrgencyRule,
  impactRule: () => "中",
};

/** type → 规则（结构化分派，非 if 硬编码，nit-20） */
export const HARD_CONSTRAINT_RULES: Record<HardConstraint["type"], HardConstraintRule> = {
  language_requirement: languageRule,
  gpa_requirement: gpaRule,
  internship_requirement: internshipRule,
  certificate: certificateRule,
  personal_plan: personalPlanRule,
};

// ============================================================
// pressure → 第8因子分值计算
// ============================================================

const URGENCY_WEIGHT: Record<Urgency, number> = { 紧急: 1.0, 中: 0.7, 低: 0.4 };
const IMPACT_WEIGHT: Record<Impact, number> = { 高: 1.0, 中: 0.6, 低: 0.3 };
/** 第8因子归一上限（与 goalMatch 量级一致） */
export const HARD_CONSTRAINT_MAX_SCORE = 30;

/**
 * 算单条硬约束对某 goal 的 pressure 分值（0-30）。
 * pressureFunction × urgency权重 × impact权重 × 30。
 */
export function computeHardConstraintScore(
  constraint: HardConstraint,
  goal: Goal,
  current: string | null,
  now: Date,
  profile: DecisionProfile,
): { score: number; pressure: number; urgency: Urgency; impact: Impact } {
  const rule = HARD_CONSTRAINT_RULES[constraint.type];
  const pressure = rule.pressureFunction(current, constraint.value, constraint.deadline, now, profile);
  const urgency = rule.urgencyRule(constraint.deadline, now);
  const impact = rule.impactRule(goal);
  const score = Math.round(
    pressure * URGENCY_WEIGHT[urgency] * IMPACT_WEIGHT[impact] * HARD_CONSTRAINT_MAX_SCORE,
  );
  return { score, pressure, urgency, impact };
}

/** deadline → 剩余月数（导出供 reason 用） */
export { deadlineToMonthsRemaining };
