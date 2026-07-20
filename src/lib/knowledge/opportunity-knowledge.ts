/**
 * 机会知识库 TS 镜像（Phase A，决策引擎的大脑）
 *
 * ⚠️ 镜像自 `知识库-成长模型/08-机会知识库.md`（真理源）。
 *    改判断规则 = 改 md + 本 TS 同步（附 commit 说明）。
 *    代码只算不判：本文件只存 tier/reason/cost/outcome/stageRole 等判断规则，
 *    fitScore 计算在 decision engine（不在此处算分）。
 *
 * 性质：经验参考，非官方规则。不编造具体分数，tier 是 S/A/B 定性分层。
 * 覆盖：Phase A 打通 AI 保研一条线，其余走 base 兜底（不退化）。
 */
import type {
  Goal,
  GoalGrade,
  InfoCategory,
  MajorDirection,
} from "@/db/schema-enums";

/** 价值分层（决策引擎据此算 goalMatch/majorMatch 因子分） */
export type Tier = "S" | "A" | "B";

/** 机会在成长阶段中的角色（决策引擎据此算 gradeFit 因子分） */
export type StageRole = "了解" | "准备" | "冲刺" | "收尾";

/** 一条机会知识记录（08-md 第三节的 TS 镜像） */
export interface OpportunityKnowledge {
  tier: Tier;
  /** 专业方向/目标专属的适配理由（用户可见，文案禁 AI/智能/精准） */
  reason: string;
  /** 投入成本（定性） */
  cost: string;
  /** 预期产出（定性） */
  outcome: string;
  /** 该机会在成长阶段中的角色，gradeFit 依据 */
  stageRole: StageRole;
}

/** 知识库查询入参（四维画像 + 机会 category + 可选 subtype） */
export interface KnowledgeQuery {
  goal: Goal;
  majorDirection: MajorDirection | null;
  grade: GoalGrade | null;
  category: InfoCategory;
  /**
   * 机会细分（engine 层用 inferSubtype(category, title) 推断后传入）。
   * 传入时优先按 subtype 查（ACM→acm→S、犀牛鸟→ai-training-camp→A）；
   * 未传时按 category 兜底（competition→math-modeling）。
   */
  subtype?: OpportunitySubtype;
}

/**
 * AI 保研知识库（打通一条线）
 * 结构：majorDirection → category → 机会细分 → OpportunityKnowledge
 * 机会细分用 key 标识（如 "acm" / "math-modeling" / "research" / "baoyan-camp"），
 * 决策引擎按机会的实际细分匹配；匹配不到用 category 兜底（见 queryKnowledge）。
 *
 * 见 08-机会知识库.md 第三节。AI 类（ai_general/ai_cv/ai_nlp/ai_llm/ai_robotics）共享一套，
 * 用 AI_MAJOR_DIRECTIONS 数组归并。
 */
export const AI_MAJOR_DIRECTIONS: MajorDirection[] = [
  "ai_general",
  "ai_cv",
  "ai_nlp",
  "ai_llm",
  "ai_robotics",
];

/** AI 保研：机会细分 × 知识记录（08-md §3.1-3.6） */
const AI_BAOYAN_BY_SUBTYPE: {
  [K in OpportunitySubtype]: OpportunityKnowledge;
} = {
  // §3.1 科研训练
  research: {
    tier: "S",
    reason: "AI 保研核心区分度，科研产出是学硕/直博硬通货；建议大一先进实验室积累方向感",
    cost: "高（持续1-2年）",
    outcome: "顶会一作/共一、课题结题",
    stageRole: "准备",
  },
  // §3.2 高认可竞赛
  acm: {
    tier: "S",
    reason: "AI 院系筛选看重算法与工程能力，证明基础",
    cost: "极高（1000+小时）",
    outcome: "区域赛/省奖以上",
    stageRole: "准备",
  },
  "math-modeling": {
    tier: "A",
    reason: "数学/统计/优化基础证明，保研综测加分，但非 AI 核心区分度",
    cost: "低（3天+训练）",
    outcome: "国奖/省奖",
    stageRole: "准备",
  },
  "challenge-cup": {
    tier: "A",
    reason: "综合科研能力展示，保研加分",
    cost: "中",
    outcome: "国家级/省级奖",
    stageRole: "准备",
  },
  // §3.3 开源
  "open-source": {
    tier: "S",
    reason: "大模型/工程方向硬通货，证明工程力",
    cost: "中（持续）",
    outcome: "知名项目贡献、独立项目",
    stageRole: "准备",
  },
  // §3.4 大创
  dachuang: {
    tier: "A",
    reason: "科研经历载体，重点看成果质量",
    cost: "中",
    outcome: "结题/论文/专利",
    stageRole: "准备",
  },
  // §3.5 保研夏令营（stageRole 随 grade 变，见 gradeAdjustedBaoyanCamp）
  "baoyan-camp": {
    tier: "B",
    reason: "距夏令营申请还有时间，当前应专注打地基，大三再重点关注",
    cost: "低",
    outcome: "优秀营员=预录取",
    stageRole: "了解",
  },
  // §3.6 实习/训练营
  "ai-training-camp": {
    tier: "A",
    reason: "AI 方向工程能力 + 大厂背书，对工程类保研/就业都加分",
    cost: "中",
    outcome: "offer/经历",
    stageRole: "准备",
  },
  internship: {
    tier: "B",
    reason: "对 AI 保研帮助有限（专硕/工程类稍有帮助）",
    cost: "中",
    outcome: "经历",
    stageRole: "准备",
  },
  other: {
    tier: "B",
    reason: "经验参考，需结合具体机会判断价值",
    cost: "中",
    outcome: "—",
    stageRole: "了解",
  },
  // 4.1 新增 subtype（向量匹配覆盖用，AI 保研 knowledge 兜底走 other 语义）
  "clinical-internship": {
    tier: "A",
    reason: "临床实践经历，医学/康复方向核心区分度",
    cost: "中",
    outcome: "临床经历/规培证明",
    stageRole: "准备",
  },
  "case-competition": {
    tier: "A",
    reason: "商业分析能力展示，经管方向区分度",
    cost: "中",
    outcome: "国家级/省级奖",
    stageRole: "准备",
  },
  "arts-competition": {
    tier: "A",
    reason: "创意设计能力展示，艺术/传媒方向区分度",
    cost: "中",
    outcome: "国家级/省级奖",
    stageRole: "准备",
  },
  "electronic-design": {
    tier: "A",
    reason: "电子工程能力展示，电气/电子方向区分度",
    cost: "中",
    outcome: "国家级/省级奖",
    stageRole: "准备",
  },
};

/**
 * 保研夏令营按 grade 调整（owner 痛点②：年级时机）
 *
 * 语义澄清（Phase A 第三步修正，避免与 gradeFit 双重扣分）：
 *  - tier 保持 S（夏令营是 AI 保研拿 offer 主路径，专业价值不随年级降级）。
 *  - 仅 stageRole 随年级变（大一了解 / 大三冲刺 / 大四收尾）。
 *  - 年级时机由 gradeFit 因子体现（大一+了解=-15 压末位），不在 tier 重复扣分。
 *
 * 大一 = 了解（远期，gradeFit 负压末位）；大三 = 冲刺（当期，gradeFit 正升首位）；大四 = 收尾。
 */
function gradeAdjustedBaoyanCamp(
  grade: GoalGrade | null,
): OpportunityKnowledge {
  if (grade === "junior") {
    return {
      tier: "S",
      reason: "大三下正是投递夏令营时机，3-5 月投材料，是拿 offer 主路径",
      cost: "低",
      outcome: "优秀营员=预录取",
      stageRole: "冲刺",
    };
  }
  if (grade === "senior") {
    return {
      tier: "S",
      reason: "已过夏令营申请季，仅收尾/补录",
      cost: "低",
      outcome: "—",
      stageRole: "收尾",
    };
  }
  // freshman / sophomore / null（远期，专业价值仍 S，但当下不该冲刺）
  return {
    tier: "S",
    reason: "夏令营是 AI 保研拿 offer 主路径，但大一距申请较远，当前应专注打地基，大三再重点关注",
    cost: "低",
    outcome: "优秀营员=预录取",
    stageRole: "了解",
  };
}

/**
 * 机会细分标识（用于知识库匹配）
 * 决策引擎拿到候选机会后，据其 category + 标题/标签推断 subtype，再查知识库。
 * Phase A：subtype 推断规则简单（按 category + 关键词），Phase B 可扩展。
 */
export type OpportunitySubtype =
  | "research"
  | "acm"
  | "math-modeling"
  | "challenge-cup"
  | "open-source"
  | "dachuang"
  | "baoyan-camp"
  | "ai-training-camp"
  | "internship"
  | "clinical-internship"
  | "case-competition"
  | "arts-competition"
  | "electronic-design"
  | "other";

/**
 * 从机会推断 subtype（Phase A 简单规则）
 * @param category 机会类别
 * @param title 标题（关键词匹配）
 * @param valueTags 价值标签（如有）
 */
export function inferSubtype(
  category: InfoCategory,
  title: string,
  valueTags?: string[] | null,
): OpportunitySubtype {
  const tags = valueTags ?? [];
  const hay = `${title ?? ""} ${tags.join(" ")}`;
  if (category === "research") return "research";
  if (category === "baoyan") return "baoyan-camp";
  if (category === "internship") {
    // 临床实习/规培/见习（康复/医学场景，4.1 补）
    if (/临床|规培|见习|实习医生|住院医师/i.test(hay)) return "clinical-internship";
    if (/训练营|青训营|犀牛鸟|北斗|aidu|阿里星/i.test(hay)) return "ai-training-camp";
    return "internship";
  }
  if (category === "competition") {
    // 电子设计/电赛 先判（"设计"关键词与 arts-competition 的"设计"冲突，须先匹配电赛）
    if (/电子设计|电赛|nuedc|电子竞赛/i.test(hay)) return "electronic-design";
    if (/acm|icpc|ccpc|程序设计/i.test(hay)) return "acm";
    if (/数学建模|数模|cumcm/i.test(hay)) return "math-modeling";
    if (/挑战杯/i.test(hay)) return "challenge-cup";
    if (/大创|创新创业训练|国家级创新/i.test(hay)) return "dachuang";
    if (/案例|商业|市场调查|营销/i.test(hay)) return "case-competition";
    if (/广告|艺术|美术|动画/i.test(hay)) return "arts-competition";
    if (/设计/i.test(hay)) return "arts-competition"; // 含"设计"但非电子设计 → 艺术设计类
    return "math-modeling"; // 通用竞赛兜底归到数模型
  }
  if (/开源|github|gsoc/i.test(hay)) return "open-source";
  return "other";
}

/**
 * 知识库查询（决策引擎调用入口）
 *
 * 查询顺序：
 * 1. AI 保研：按 subtype 查 AI_BAOYAN_BY_SUBTYPE（保研夏令营走 grade 调整）
 *    subtype 由 engine 层 inferSubtype(category, title) 推断后传入（ACM→acm→S、犀牛鸟→ai-training-camp→A）；
 *    未传 subtype 时按 category 兜底（competition→math-modeling）。
 * 2. 其余 majorDirection/goal：暂走 base 兜底（返回 null，决策引擎用 01 矩阵 goal×category）
 *
 * 返回 null = 知识库未覆盖该四维组合，决策引擎应回退 base（01 矩阵 tier）。
 */
export function queryKnowledge(q: KnowledgeQuery): OpportunityKnowledge | null {
  const { goal, majorDirection, grade, category, subtype } = q;

  // AI 保研一条线（08-md 第三节）
  const isAI = majorDirection && AI_MAJOR_DIRECTIONS.includes(majorDirection);
  if (goal === "baoyan" && isAI) {
    // 保研夏令营按 grade 调整（stageRole 随年级变，tier 恒 S）
    if (category === "baoyan") {
      return gradeAdjustedBaoyanCamp(grade);
    }
    // 其余 category 按 subtype 查：
    //   - engine 传入 subtype（inferSubtype 推断）→ 精确匹配（ACM→acm→S、犀牛鸟→ai-training-camp→A）
    //   - 未传 subtype → 按 category 兜底（competition→math-modeling）
    const sub = subtype ?? categoryToAISubtype(category);
    const rec = AI_BAOYAN_BY_SUBTYPE[sub];
    return rec ?? null;
  }

  // 其余四维组合：Phase A 未覆盖，返回 null 让决策引擎回退 base
  return null;
}

/** category → AI 保研 subtype 兜底（无标题时） */
function categoryToAISubtype(category: InfoCategory): OpportunitySubtype {
  switch (category) {
    case "research":
      return "research";
    case "competition":
      return "math-modeling"; // 通用竞赛兜底
    case "internship":
      return "internship";
    case "baoyan":
      return "baoyan-camp";
    default:
      return "other";
  }
}
