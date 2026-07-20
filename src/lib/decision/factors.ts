/**
 * 决策引擎 — 6 因子纯函数（Phase A 第三步）
 *
 * fitScore = goalMatch + majorMatch + gradeFit + schoolFit + roi - timeConflict（简单求和，非黑盒）。
 * 每个因子返回 Factor[]（{name, score, reason, source} 三元组），可追溯（铁律②）。
 *
 * 分值标定见《因子基准分表》（AGENT_COMMUNICATION.md，B 第 39/40 条 review 通过 + 方案 A 采纳）。
 * fitScore 是「适配度排序分」，不是真实保研加分（不编造具体数值）。
 *
 * 护栏：不引 AI；分值可解释可追溯；文案禁 AI/智能/精准；不动 schema/认证/搜索。
 */
import type {
  Goal,
  GoalGrade,
  InfoCategory,
  MajorDirection,
  SchoolTier,
} from "@/db/schema-enums";
import { VALUE_MATRIX, type ValueEntry } from "@/lib/recommend";
import {
  queryKnowledge,
  type OpportunityKnowledge,
  type StageRole,
  type Tier,
} from "@/lib/knowledge/opportunity-knowledge";
import type { CompetitionLevel, CompetitionRecognition } from "@/lib/search";

/** 单个因子三元组（铁律②可解释） */
export interface Factor {
  name: string;
  score: number;
  reason: string;
  source: string;
}

/** 决策引擎用到的机会字段（从 searchItems hit + competitions 明细取） */
export interface DecisionOpportunity {
  id: string;
  title: string;
  category: InfoCategory;
  /** 竞赛级别（非竞赛类可空） */
  level?: CompetitionLevel | null;
  /** 竞赛认可度 */
  recognition?: CompetitionRecognition | null;
  /** 报名截止 */
  signUpEnd?: Date | null;
}

/** 决策画像（从 user_profiles + profile.ts 取） */
export interface DecisionProfile {
  goal: Goal;
  schoolTier: SchoolTier | null;
  majorDirection: MajorDirection | null;
  grade: GoalGrade | null;
}

/** tier → 分值映射（集中一处可审，铁律②） */
export const TIER_SCORE: Record<Tier, number> = {
  S: 30,
  A: 15,
  B: 5,
};

/** majorMatch 专用 tier 映射（专业方向价值，与 goalMatch 区分：AI 分流关键） */
export const MAJOR_TIER_SCORE: Record<Tier, number> = {
  S: 25,
  A: 10,
  B: 2,
};

// ============================================================
// 因子 1：goalMatch — 机会对该目标的价值（base 维度）
// 来源：VALUE_MATRIX[goal][category].tier
// ============================================================

/**
 * goalMatch：按 goal 查 VALUE_MATRIX 得 tier → 分值。
 * 回答"这类机会对该目标有没有价值"。
 */
export function goalMatch(goal: Goal, opp: DecisionOpportunity): Factor | null {
  const entry: ValueEntry | undefined = VALUE_MATRIX[goal]?.[opp.category];
  if (!entry) return null; // 该 category 对此 goal 不适用，不进候选
  return {
    name: "goalMatch",
    score: TIER_SCORE[entry.tier],
    reason: `${goalLabel(goal)}目标下${categoryLabel(opp.category)}价值 ${entry.tier} 级`,
    source: `VALUE_MATRIX[${goal}][${opp.category}].tier`,
  };
}

// ============================================================
// 因子 2：majorMatch — 专业方向分流（owner 痛点①核心）
// 来源：queryKnowledge({goal,majorDirection,grade,category}).tier
// AI 走 knowledge（数模对 AI=A 降级），非 AI null=0 走 base 不退化
// ============================================================

/**
 * majorMatch：查知识库得专业方向 tier → 分值。
 * 回答"这个专业方向下价值多大"。AI 保研数模=A（降级），ACM=S（核心）。
 *
 * engine 层应先 inferSubtype(category, title) 推断 subtype 后通过 knowledge 传入
 * （或 engine 调 queryKnowledge 传 subtype），使 ACM→acm→S、犀牛鸟→ai-training-camp→A。
 * factors.ts 本函数接收 engine 已注入 subtype 的 knowledge（见 majorMatchWithKnowledge）。
 */
export function majorMatch(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
): Factor {
  const knowledge: OpportunityKnowledge | null = queryKnowledge({
    goal: profile.goal,
    majorDirection: profile.majorDirection,
    grade: profile.grade,
    category: opp.category,
  });
  if (!knowledge) {
    // 知识库未覆盖（非 AI 方向 / 未打通 goal）→ 走 base，不加分不扣分（非 AI 不退化）
    return {
      name: "majorMatch",
      score: 0,
      reason: "专业方向未覆盖，按通用价值判断",
      source: "knowledge:null(回退base)",
    };
  }
  return {
    name: "majorMatch",
    score: MAJOR_TIER_SCORE[knowledge.tier],
    reason: knowledge.reason,
    source: `knowledge:${profile.majorDirection}/${opp.category}.tier=${knowledge.tier}`,
  };
}

/**
 * majorMatch（engine 注入已推断 subtype 的 knowledge 版本）。
 * engine 层用 inferSubtype(category, title) 推断 subtype 后查 knowledge，传入本函数。
 * 解决偏差1/2：ACM→acm subtype→tier S→+25；犀牛鸟→ai-training-camp→tier A→+10。
 */
export function majorMatchWithKnowledge(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
  knowledge: OpportunityKnowledge | null,
): Factor {
  if (!knowledge) {
    return {
      name: "majorMatch",
      score: 0,
      reason: "专业方向未覆盖，按通用价值判断",
      source: "knowledge:null(回退base)",
    };
  }
  return {
    name: "majorMatch",
    score: MAJOR_TIER_SCORE[knowledge.tier],
    reason: knowledge.reason,
    source: `knowledge:${profile.majorDirection}/${opp.category}(subtype).tier=${knowledge.tier}`,
  };
}

// ============================================================
// 因子 3：gradeFit — 阶段意识（owner 痛点②核心，方案 A 采纳）
// 来源：queryKnowledge().stageRole × profile.grade（08-md 第六节匹配表）
// 方案 A：大一 + 了解 = -15（"你现在不该做的当期动作"=负，通用规则）
// ============================================================

/**
 * gradeFit：用户 grade × 机会 stageRole 匹配表（方案 A 修正版，B 第 40 条采纳）。
 * 表格每格语义见注释。
 */
const GRADE_FIT_TABLE: Record<GoalGrade, Record<StageRole, number>> = {
  freshman: {
    // 大一：了解期正当时但"了解"类远期机会不该当期冲刺 → 了解给负（不该现在做）
    了解: -15, // freshman+了解：大一不该做的远期当期动作（如夏令营），负向压末位
    准备: 15, // freshman+准备：大一开始准备正当时（如科研进实验室），正
    冲刺: -20, // freshman+冲刺：大一非冲刺期，强推冲刺机会压末位
    收尾: -25, // freshman+收尾：大一不适用收尾类
  },
  sophomore: {
    了解: 5, // sophomore+了解：大二可了解远期，中性偏正
    准备: 18, // sophomore+准备：大二准备期核心
    冲刺: 5, // sophomore+冲刺：大二尚早，轻正
    收尾: -20, // sophomore+收尾：大二不适用
  },
  junior: {
    了解: 5, // junior+了解：大三已过了解期，轻正
    准备: 15, // junior+准备：大三仍可准备
    冲刺: 20, // junior+冲刺：大三冲刺期正当时，最高（夏令营大三升首位）
    收尾: 8, // junior+收尾：大三可开始收尾动作
  },
  senior: {
    了解: -10, // senior+了解：大四已过了解期，负
    准备: -15, // senior+准备：大四不宜新准备
    冲刺: -20, // senior+冲刺：大四已过冲刺期，负
    收尾: 12, // senior+收尾：大四收尾期正当时
  },
};

/**
 * gradeFit：查知识库 stageRole × 用户 grade 表。
 * 知识库无 stageRole（非 AI 方向）→ 中性 0（不评阶段，走 base）。
 *
 * engine 层应传入已推断 subtype 的 knowledge（见 gradeFitWithKnowledge），
 * 使 ACM 等精确 subtype 的 stageRole 被正确读取。
 */
export function gradeFit(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
): Factor {
  const knowledge = queryKnowledge({
    goal: profile.goal,
    majorDirection: profile.majorDirection,
    grade: profile.grade,
    category: opp.category,
  });
  return gradeFitFromKnowledge(profile, knowledge);
}

/** gradeFit（engine 注入已推断 subtype 的 knowledge 版本） */
export function gradeFitWithKnowledge(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
  knowledge: OpportunityKnowledge | null,
): Factor {
  return gradeFitFromKnowledge(profile, knowledge);
}

function gradeFitFromKnowledge(
  profile: DecisionProfile,
  knowledge: OpportunityKnowledge | null,
): Factor {
  if (!profile.grade || !knowledge?.stageRole) {
    return {
      name: "gradeFit",
      score: 0,
      reason: "年级或阶段角色未明确，不评阶段适配",
      source: "gradeFit:neutral(无stageRole或无grade)",
    };
  }
  const score = GRADE_FIT_TABLE[profile.grade][knowledge.stageRole];
  return {
    name: "gradeFit",
    score,
    reason: `${gradeLabel(profile.grade)} × 机会阶段(${knowledge.stageRole})：${gradeFitReason(profile.grade, knowledge.stageRole)}`,
    source: `gradeFit表[${profile.grade}][${knowledge.stageRole}]`,
  };
}

// ============================================================
// 因子 4：schoolFit — 学校层次 × 机会门槛错配
// 来源：profile.schoolTier × opp.level/recognition
// ============================================================

/**
 * schoolFit：学校层次与机会门槛的适配。
 * - C9/c985 + international/official_A → +5（顶尖校适配高门槛）
 * - c211/doubleFirst + national/official_A → +3（适配，加分明显）
 * - c211 + international（如 ACM-ICPC 国际级）→ 0（可冲但门槛高）
 * - other + 顶尖夏令营(school级目标院校) → -8（错配，概率低）
 * - schoolTier=null → 0（不评）
 */
export function schoolFit(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
): Factor {
  if (!profile.schoolTier) {
    return {
      name: "schoolFit",
      score: 0,
      reason: "未填学校层次，不评门槛适配",
      source: "schoolFit:neutral(无schoolTier)",
    };
  }
  const tier = profile.schoolTier;
  const level = opp.level ?? null;
  const recognition = opp.recognition ?? null;

  // 顶尖校（C9/985）+ 高门槛机会 → 适配
  if (tier === "C9" || tier === "c985") {
    if (level === "international" || recognition === "official_A") {
      return {
        name: "schoolFit",
        score: 5,
        reason: "顶尖校适配高门槛机会",
        source: `schoolFit:C9/c985+高门槛`,
      };
    }
    return {
      name: "schoolFit",
      score: 3,
      reason: "顶尖校层次适配",
      source: "schoolFit:C9/c985+base",
    };
  }

  // 211/双一流
  if (tier === "c211" || tier === "doubleFirst") {
    // 211 + 顶尖夏令营（school 级目标院校，如北大夏令营）→ 错配（先判，不论 recognition）
    if (opp.category === "baoyan" && level === "school") {
      return {
        name: "schoolFit",
        score: -8,
        reason: "211 冲顶尖院校夏令营门槛高，错配",
        source: "schoolFit:c211+顶尖夏令营错配",
      };
    }
    if (level === "international") {
      return {
        name: "schoolFit",
        score: 0,
        reason: "211 冲国际级机会门槛高，可冲但不加分",
        source: "schoolFit:c211+international",
      };
    }
    if (recognition === "official_A" || level === "national") {
      return {
        name: "schoolFit",
        score: 3,
        reason: "211/双一流适配国家级高认可机会",
        source: "schoolFit:c211/doubleFirst+national/official_A",
      };
    }
    return {
      name: "schoolFit",
      score: 0,
      reason: "211/双一流层次中性适配",
      source: "schoolFit:c211/doubleFirst+base",
    };
  }

  // other（普通本科）+ 顶尖机会 → 错配
  if (tier === "other") {
    if (opp.category === "baoyan" && level === "school") {
      return {
        name: "schoolFit",
        score: -8,
        reason: "普通本科冲顶尖院校夏令营门槛高，错配",
        source: "schoolFit:other+顶尖夏令营错配",
      };
    }
    if (level === "international" || recognition === "official_A") {
      return {
        name: "schoolFit",
        score: -3,
        reason: "普通本科冲高门槛机会概率较低",
        source: "schoolFit:other+高门槛",
      };
    }
    return {
      name: "schoolFit",
      score: 0,
      reason: "普通本科层次中性",
      source: "schoolFit:other+base",
    };
  }

  return {
    name: "schoolFit",
    score: 0,
    reason: "学校层次适配中性",
    source: "schoolFit:default",
  };
}

// ============================================================
// 因子 5：roi — 投入产出比
// 来源：queryKnowledge().cost × .outcome
// ============================================================

/**
 * roi：投入（cost）× 产出（outcome）→ 分值。
 * 低投入高回报（夏令营当期优秀营员）最高；极高投入（ACM 1000+小时）拉低。
 *
 * engine 层应传入已推断 subtype 的 knowledge（见 roiWithKnowledge）。
 */
export function roi(profile: DecisionProfile, opp: DecisionOpportunity): Factor {
  const knowledge = queryKnowledge({
    goal: profile.goal,
    majorDirection: profile.majorDirection,
    grade: profile.grade,
    category: opp.category,
  });
  return roiFromKnowledge(knowledge);
}

/** roi（engine 注入已推断 subtype 的 knowledge 版本） */
export function roiWithKnowledge(
  profile: DecisionProfile,
  opp: DecisionOpportunity,
  knowledge: OpportunityKnowledge | null,
): Factor {
  return roiFromKnowledge(knowledge);
}

function roiFromKnowledge(knowledge: OpportunityKnowledge | null): Factor {
  if (!knowledge) {
    return {
      name: "roi",
      score: 0,
      reason: "专业方向未覆盖，不评投入产出",
      source: "roi:neutral(无knowledge)",
    };
  }
  const score = computeRoi(knowledge.cost, knowledge.outcome);
  return {
    name: "roi",
    score,
    reason: `投入${knowledge.cost}→产出${knowledge.outcome}`,
    source: `roi:cost/outcome(${knowledge.cost}/${knowledge.outcome})`,
  };
}

/** cost × outcome → roi 分值（集中映射可审） */
function computeRoi(cost: string, outcome: string): number {
  // 极高投入（ACM 1000+小时）→ 拉低
  if (cost.includes("极高")) {
    return 3;
  }
  // 低投入
  if (cost.includes("低")) {
    // 低投入 + 高回报（优秀营员/offer/预录取）
    if (outcome.includes("优秀营员") || outcome.includes("预录取") || outcome.includes("offer")) {
      return 12;
    }
    if (outcome.includes("国奖") || outcome.includes("省奖")) {
      return 5;
    }
    return 2; // 低投入无明确产出
  }
  // 中投入
  if (cost.includes("中")) {
    if (outcome.includes("顶会") || outcome.includes("一作") || outcome.includes("结题")) {
      return 10;
    }
    if (outcome.includes("贡献") || outcome.includes("项目") || outcome.includes("经历")) {
      return 5;
    }
    return 5;
  }
  // 高投入（持续1-2年，科研）
  if (cost.includes("高")) {
    if (outcome.includes("顶会") || outcome.includes("一作")) {
      return 8;
    }
    return 5;
  }
  return 5;
}

// ============================================================
// 因子 6：timeConflict — 时间冲突（负向，收紧2：-100 不静默丢弃）
// 来源：opp.signUpEnd × now
// ============================================================

/** 报名已截止的标记分（不静默丢弃，排末位标"已截止"，铁律②可解释） */
export const TIME_CONFLICT_CLOSED = -100;

/**
 * timeConflict：报名截止时间 × 当前时间。
 * - 已过（signUpEnd < now）→ -100 标"已截止"（不静默丢弃，决策引擎排末位）
 * - 距截止 ≤7 天 → -15（来不及准备）
 * - 7-60 天 → 0（正常窗口）
 * - >60 天 / 无截止 → 0（远期或不适用）
 *
 * now 可注入便于测试。
 */
export function timeConflict(
  opp: DecisionOpportunity,
  now: Date = new Date(),
): Factor {
  if (!opp.signUpEnd) {
    return {
      name: "timeConflict",
      score: 0,
      reason: "无报名截止时间，不评时间冲突",
      source: "timeConflict:no-signUpEnd",
    };
  }
  const diffMs = opp.signUpEnd.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) {
    return {
      name: "timeConflict",
      score: TIME_CONFLICT_CLOSED,
      reason: "报名已截止",
      source: `timeConflict:signUpEnd<now(${diffDays.toFixed(0)}天前)`,
    };
  }
  if (diffDays <= 7) {
    return {
      name: "timeConflict",
      score: -15,
      reason: `距报名截止仅 ${diffDays.toFixed(0)} 天，来不及准备`,
      source: `timeConflict:≤7天`,
    };
  }
  if (diffDays <= 60) {
    return {
      name: "timeConflict",
      score: 0,
      reason: `报名窗口正常（距截止 ${diffDays.toFixed(0)} 天）`,
      source: `timeConflict:7-60天`,
    };
  }
  return {
    name: "timeConflict",
    score: 0,
    reason: `距截止较远（${diffDays.toFixed(0)} 天），远期`,
    source: `timeConflict:>60天`,
  };
}

// ============================================================
// 辅助：标签（文案合规，无 AI/智能/精准）
// ============================================================

function goalLabel(goal: Goal): string {
  const labels: Record<Goal, string> = {
    baoyan: "保研",
    employment: "就业",
    civilService: "考公",
    abroad: "出国",
    entrepreneurship: "创业",
  };
  return labels[goal];
}

function categoryLabel(cat: InfoCategory): string {
  const labels: Record<InfoCategory, string> = {
    competition: "竞赛",
    research: "科研",
    exam: "考试",
    scholarship: "奖学金",
    baoyan: "保研",
    opportunity: "发展机会",
    internship: "实习",
  };
  return labels[cat];
}

function gradeLabel(grade: GoalGrade): string {
  const labels: Record<GoalGrade, string> = {
    freshman: "大一",
    sophomore: "大二",
    junior: "大三",
    senior: "大四",
  };
  return labels[grade];
}

function gradeFitReason(grade: GoalGrade, stageRole: StageRole): string {
  const map: Record<GoalGrade, Partial<Record<StageRole, string>>> = {
    freshman: {
      了解: "大一不该做的远期当期动作",
      准备: "大一开始准备正当时",
      冲刺: "大一非冲刺期",
      收尾: "大一不适用收尾",
    },
    sophomore: {
      了解: "大二可了解远期",
      准备: "大二准备期核心",
      冲刺: "大二尚早",
      收尾: "大二不适用",
    },
    junior: {
      了解: "大三已过了解期",
      准备: "大三仍可准备",
      冲刺: "大三冲刺期正当时",
      收尾: "大三可开始收尾",
    },
    senior: {
      了解: "大四已过了解期",
      准备: "大四不宜新准备",
      冲刺: "大四已过冲刺期",
      收尾: "大四收尾期正当时",
    },
  };
  return map[grade]?.[stageRole] ?? "阶段适配";
}
