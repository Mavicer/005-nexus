/**
 * 学科能力轴向量 TS 镜像（Phase A 4.1，通用化决策大脑）
 *
 * ⚠️ 镜像自 `知识库-成长模型/09-学科能力轴与机会向量.md`（真理源）。
 *    改判断规则 = 改 md + 本 TS 同步（附 commit 说明）。
 *    代码只算不判：本文件存向量 + classifyMajor/majorMatchScore 纯计算。
 *
 * 取代枚举架构的 majorMatch 数据源（majorDirection 枚举 + inferSubtype 特调）。
 * 任意专业都能算向量点积，不靠枚举不靠特调（owner 铁律①③⑨）。
 *
 * 性质：经验参考，非官方规则。向量值 0-1 定性能力权重，不编造具体保研加分。
 */
import type { OpportunitySubtype } from "./opportunity-knowledge";

/** 7 学科能力轴 */
export type Axis =
  | "math"
  | "research"
  | "clinical"
  | "engineering"
  | "humanities"
  | "business"
  | "arts";

/** 所有轴的固定顺序（向量运算用） */
export const AXES: Axis[] = [
  "math",
  "research",
  "clinical",
  "engineering",
  "humanities",
  "business",
  "arts",
];

/** 专业/机会的能力向量（0.0-1.0，一位小数） */
export type MajorVector = Record<Axis, number>;

/** 机会向量（按 subtype 标，镜像 09-md §5） */
export interface OpportunityVector {
  subtype: OpportunitySubtype;
  vector: MajorVector;
}

/** classifyMajor 返回 */
export interface ClassifyResult {
  vector: MajorVector;
  /** 命中的教育部门类（未命中 null） */
  discipline: string | null;
  /** 置信度：0.8 命中门类+细分 / 0.6 只门类 / 0.2 归一失败落中性 */
  confidence: number;
}

/** majorMatchScore 返回 */
export interface MajorMatchResult {
  /** 适配度分（0-25，归一） */
  score: number;
  /** 点积贡献最大的轴（给 reason 用） */
  dominantAxis: Axis;
  /** 个性化原因（措辞合规，无 AI/智能/精准） */
  reason: string;
  /** 原始点积（调试/可追溯） */
  dotSum: number;
}

// ============================================================
// §3 教育部 13 门类 → 基准向量（镜像 09-md §3）
// ============================================================

export const DISCIPLINE_BASE_VECTORS: Record<string, MajorVector> = {
  哲学: { math: 0.3, research: 0.6, clinical: 0, engineering: 0, humanities: 0.9, business: 0.1, arts: 0.1 },
  经济学: { math: 0.6, research: 0.3, clinical: 0, engineering: 0.2, humanities: 0.2, business: 0.9, arts: 0.1 },
  法学: { math: 0.3, research: 0.4, clinical: 0, engineering: 0.1, humanities: 0.8, business: 0.5, arts: 0.1 },
  教育学: { math: 0.2, research: 0.4, clinical: 0.2, engineering: 0.1, humanities: 0.6, business: 0.4, arts: 0.3 },
  文学: { math: 0.1, research: 0.3, clinical: 0, engineering: 0.1, humanities: 0.8, business: 0.3, arts: 0.5 },
  历史学: { math: 0.2, research: 0.7, clinical: 0, engineering: 0, humanities: 0.9, business: 0.1, arts: 0.2 },
  理学: { math: 0.9, research: 0.8, clinical: 0.1, engineering: 0.4, humanities: 0.2, business: 0.1, arts: 0.1 },
  工学: { math: 0.7, research: 0.5, clinical: 0.1, engineering: 0.9, humanities: 0.1, business: 0.2, arts: 0.1 },
  农学: { math: 0.5, research: 0.7, clinical: 0.6, engineering: 0.4, humanities: 0.1, business: 0.2, arts: 0.1 },
  医学: { math: 0.4, research: 0.6, clinical: 0.9, engineering: 0.2, humanities: 0.2, business: 0.1, arts: 0.1 },
  管理学: { math: 0.4, research: 0.3, clinical: 0, engineering: 0.3, humanities: 0.3, business: 0.9, arts: 0.1 },
  艺术学: { math: 0.1, research: 0.2, clinical: 0.1, engineering: 0.3, humanities: 0.4, business: 0.3, arts: 0.9 },
  交叉学科: { math: 0.5, research: 0.5, clinical: 0.3, engineering: 0.5, humanities: 0.3, business: 0.3, arts: 0.3 },
};

/** 门类匹配关键词（classifyMajor 第一步，镜像 09-md §3） */
export const DISCIPLINE_KEYWORDS: { discipline: string; keywords: string[] }[] = [
  { discipline: "哲学", keywords: ["哲学", "宗教学", "逻辑学"] },
  { discipline: "经济学", keywords: ["经济", "金融", "财政", "贸易", "保险"] },
  { discipline: "法学", keywords: ["法学", "法律", "政治学", "社会学", "马克思"] },
  { discipline: "教育学", keywords: ["教育", "体育", "学前教育", "心理学"] },
  { discipline: "文学", keywords: ["中文", "外语", "新闻", "传播", "汉语言", "翻译"] },
  { discipline: "历史学", keywords: ["历史", "考古", "文物"] },
  { discipline: "理学", keywords: ["数学", "物理", "化学", "生物", "天文", "地理", "统计"] },
  {
    discipline: "工学",
    keywords: ["计算机", "电子", "通信", "机械", "土木", "建筑", "自动化", "电气", "材料", "化工", "航空航天", "人工智能", "软件"],
  },
  { discipline: "农学", keywords: ["农学", "林学", "园艺", "植保", "畜牧", "兽医", "水产"] },
  { discipline: "医学", keywords: ["临床", "医学", "口腔", "护理", "药学", "中医", "康复", "公共卫生", "影像", "检验"] },
  { discipline: "管理学", keywords: ["管理", "工商", "会计", "市场营销", "人力资源", "物流", "旅游"] },
  { discipline: "艺术学", keywords: ["美术", "设计", "音乐", "舞蹈", "戏剧", "影视", "动画", "广告"] },
  { discipline: "交叉学科", keywords: ["交叉", "新兴"] },
];

// ============================================================
// §4 门类内细分关键词微调（镜像 09-md §4）
// ============================================================

export interface KeywordAdjust {
  /** 匹配的门类（null = 任意门类通用微调） */
  discipline: string | null;
  /** 关键词 */
  kw: string;
  axis: Axis;
  /** 加减值（一位小数，最终 clamp 0-1） */
  delta: number;
}

export const SUBTYPE_KEYWORD_ADJUST: KeywordAdjust[] = [
  // 医学门类
  { discipline: "医学", kw: "康复", axis: "clinical", delta: 0.1 },
  { discipline: "医学", kw: "临床", axis: "clinical", delta: 0.1 },
  { discipline: "医学", kw: "口腔", axis: "clinical", delta: 0.1 },
  { discipline: "医学", kw: "口腔", axis: "engineering", delta: 0.1 },
  { discipline: "医学", kw: "护理", axis: "clinical", delta: 0.1 },
  { discipline: "医学", kw: "中医", axis: "research", delta: 0.1 },
  { discipline: "医学", kw: "中医", axis: "humanities", delta: 0.1 },
  { discipline: "医学", kw: "药学", axis: "research", delta: 0.2 },
  { discipline: "医学", kw: "药学", axis: "clinical", delta: -0.1 },
  { discipline: "医学", kw: "公共卫生", axis: "research", delta: 0.1 },
  { discipline: "医学", kw: "公共卫生", axis: "business", delta: 0.1 },
  { discipline: "医学", kw: "影像", axis: "clinical", delta: 0.1 },
  { discipline: "医学", kw: "影像", axis: "engineering", delta: 0.1 },
  { discipline: "医学", kw: "检验", axis: "clinical", delta: 0.1 },
  { discipline: "医学", kw: "检验", axis: "engineering", delta: 0.1 },
  // 工学门类
  { discipline: "工学", kw: "计算机", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "计算机", axis: "math", delta: 0.1 },
  { discipline: "工学", kw: "软件", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "软件", axis: "math", delta: 0.1 },
  { discipline: "工学", kw: "人工智能", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "人工智能", axis: "research", delta: 0.3 },
  { discipline: "工学", kw: "电子", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "电子", axis: "math", delta: 0.1 },
  { discipline: "工学", kw: "通信", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "通信", axis: "math", delta: 0.1 },
  { discipline: "工学", kw: "机械", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "机械", axis: "clinical", delta: -0.1 },
  { discipline: "工学", kw: "土木", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "土木", axis: "clinical", delta: -0.1 },
  { discipline: "工学", kw: "建筑", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "化工", axis: "research", delta: 0.1 },
  { discipline: "工学", kw: "化工", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "材料", axis: "research", delta: 0.1 },
  { discipline: "工学", kw: "材料", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "航空航天", axis: "engineering", delta: 0.1 },
  { discipline: "工学", kw: "航空航天", axis: "math", delta: 0.1 },
  // 理学门类
  { discipline: "理学", kw: "数学", axis: "math", delta: 0.1 },
  { discipline: "理学", kw: "统计", axis: "math", delta: 0.1 },
  { discipline: "理学", kw: "物理", axis: "math", delta: 0.1 },
  { discipline: "理学", kw: "物理", axis: "research", delta: 0.1 },
  { discipline: "理学", kw: "化学", axis: "research", delta: 0.1 },
  { discipline: "理学", kw: "生物", axis: "research", delta: 0.1 },
  { discipline: "理学", kw: "天文", axis: "research", delta: 0.1 },
  { discipline: "理学", kw: "地理", axis: "research", delta: 0.1 },
  // 经济学/管理学
  { discipline: "经济学", kw: "金融工程", axis: "math", delta: 0.2 },
  { discipline: "经济学", kw: "量化", axis: "math", delta: 0.2 },
  { discipline: "管理学", kw: "会计", axis: "business", delta: 0.1 },
  { discipline: "管理学", kw: "审计", axis: "business", delta: 0.1 },
  { discipline: "管理学", kw: "市场营销", axis: "business", delta: 0.1 },
  { discipline: "管理学", kw: "市场营销", axis: "humanities", delta: 0.1 },
  // 文学/艺术学
  { discipline: "文学", kw: "广告", axis: "arts", delta: 0.1 },
  { discipline: "文学", kw: "传媒", axis: "arts", delta: 0.1 },
  { discipline: "艺术学", kw: "设计", axis: "arts", delta: 0.1 },
  { discipline: "艺术学", kw: "设计", axis: "engineering", delta: 0.1 },
];

// ============================================================
// §5 机会类轴向量（镜像 09-md §5，按 subtype）
// ============================================================

export const OPPORTUNITY_VECTORS: Partial<Record<OpportunitySubtype, MajorVector>> = {
  research: { math: 0.5, research: 1.0, clinical: 0.3, engineering: 0.6, humanities: 0.4, business: 0.2, arts: 0.1 },
  acm: { math: 1.0, research: 0.8, clinical: 0, engineering: 0.9, humanities: 0, business: 0.1, arts: 0 },
  "math-modeling": { math: 0.9, research: 0.4, clinical: 0.1, engineering: 0.5, humanities: 0.2, business: 0.4, arts: 0 },
  "challenge-cup": { math: 0.5, research: 0.7, clinical: 0.2, engineering: 0.6, humanities: 0.4, business: 0.3, arts: 0.1 },
  "open-source": { math: 0.3, research: 0.5, clinical: 0, engineering: 1.0, humanities: 0, business: 0.2, arts: 0.1 },
  dachuang: { math: 0.5, research: 0.8, clinical: 0.3, engineering: 0.6, humanities: 0.4, business: 0.2, arts: 0.2 },
  "baoyan-camp": { math: 0.5, research: 0.6, clinical: 0.4, engineering: 0.5, humanities: 0.4, business: 0.3, arts: 0.2 },
  "ai-training-camp": { math: 0.6, research: 0.5, clinical: 0, engineering: 0.9, humanities: 0, business: 0.2, arts: 0 },
  internship: { math: 0.3, research: 0.3, clinical: 0.3, engineering: 0.5, humanities: 0.2, business: 0.5, arts: 0.2 },
  "clinical-internship": { math: 0.2, research: 0.4, clinical: 1.0, engineering: 0.2, humanities: 0.2, business: 0, arts: 0 },
  "case-competition": { math: 0.3, research: 0.3, clinical: 0.2, engineering: 0.3, humanities: 0.5, business: 0.9, arts: 0.2 },
  "arts-competition": { math: 0.1, research: 0.2, clinical: 0, engineering: 0.3, humanities: 0.4, business: 0.5, arts: 1.0 },
  "electronic-design": { math: 0.6, research: 0.5, clinical: 0, engineering: 1.0, humanities: 0.1, business: 0.2, arts: 0.1 },
  "language-exam": { math: 0.1, research: 0.2, clinical: 0, engineering: 0.1, humanities: 0.8, business: 0.3, arts: 0.1 },
  // other 兜底（中性，归一失败或未覆盖 subtype 用）
  other: { math: 0.4, research: 0.4, clinical: 0.3, engineering: 0.4, humanities: 0.4, business: 0.4, arts: 0.3 },
};

// ============================================================
// classifyMajor：专业名 → 向量（核心，通用归一）
// ============================================================

/** 归一失败时的中性兜底向量（各轴 0.3） */
const NEUTRAL_VECTOR: MajorVector = {
  math: 0.3,
  research: 0.3,
  clinical: 0.3,
  engineering: 0.3,
  humanities: 0.3,
  business: 0.3,
  arts: 0.3,
};

/**
 * 专业名 → 能力向量（classifyMajor，通用归一，不靠枚举）。
 *
 * 流程：
 * 1. 按 DISCIPLINE_KEYWORDS 匹配教育部门类 → 取基准向量
 * 2. 命中门类后，按 SUBTYPE_KEYWORD_ADJUST 微调（同门类关键词 delta 加减）
 * 3. clamp 各轴到 [0, 1]
 * 4. 门类都未命中 → 落中性向量（各轴 0.3），confidence 0.2（不报错不 0 分，给通用推荐）
 *
 * confidence：0.8 命中门类+细分 / 0.6 只门类 / 0.2 归一失败
 */
export function classifyMajor(majorText: string | null): ClassifyResult {
  if (!majorText || majorText.trim().length === 0) {
    return { vector: { ...NEUTRAL_VECTOR }, discipline: null, confidence: 0.2 };
  }
  const text = majorText.trim();

  // 1. 匹配门类
  let matchedDiscipline: string | null = null;
  for (const { discipline, keywords } of DISCIPLINE_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) {
      matchedDiscipline = discipline;
      break;
    }
  }

  if (!matchedDiscipline) {
    // 归一失败：落中性向量，不报错不 0 分（owner 铁律⑨：任意输入都给合理结果）
    return { vector: { ...NEUTRAL_VECTOR }, discipline: null, confidence: 0.2 };
  }

  // 2. 取基准向量（命中门类必存在，断言非 undefined）
  const base = DISCIPLINE_BASE_VECTORS[matchedDiscipline];
  if (!base) {
    return { vector: { ...NEUTRAL_VECTOR }, discipline: null, confidence: 0.2 };
  }
  const vector: MajorVector = { ...base };

  // 3. 门类内细分关键词微调
  let hasSubtypeMatch = false;
  for (const adj of SUBTYPE_KEYWORD_ADJUST) {
    if (adj.discipline !== null && adj.discipline !== matchedDiscipline) continue;
    if (text.includes(adj.kw)) {
      vector[adj.axis] = clamp01(vector[adj.axis] + adj.delta);
      hasSubtypeMatch = true;
    }
  }

  // 4. clamp（微调后可能超界）
  for (const axis of AXES) {
    vector[axis] = clamp01(vector[axis]);
  }

  return {
    vector,
    discipline: matchedDiscipline,
    confidence: hasSubtypeMatch ? 0.8 : 0.6,
  };
}

// ============================================================
// majorMatchScore：专业向量 × 机会向量 → 适配度（归一 0-25）
// ============================================================

/**
 * maxPossibleDot 标定值（从 OPPORTUNITY_VECTORS 实际最大点积估算）。
 * 理论极端（两向量同轴都 1.0，单轴）= 1.0；实际多轴叠加，向量都较"满"时 dotSum 可达 ~2.1。
 * 标定上限 2.2（取 AI×ACM 这类高匹配 dot≈2.12 的上界 + 余量）。
 * 标定值非魔数：见 09-md §6，4.2 review 调整。调低会让高匹配区分度下降（顶满 25）。
 */
export const MAX_POSSIBLE_DOT = 2.2;

/** majorMatch 归一上限（与枚举版 MAJOR_TIER_SCORE.S=25 量级一致） */
export const MAJOR_MATCH_MAX_SCORE = 25;

/**
 * 适配度计算：专业向量 · 机会向量（加权点积，Phase A 轴权重均等=1）。
 *
 * score = round(dotSum / MAX_POSSIBLE_DOT × 25)，归一到 0-25。
 * dominantAxis = 点积贡献最大的轴（专业[axis]×机会[axis] 最大者），给 reason。
 * reason 拼两向量该轴值 + 主导轴说明，措辞合规（无 AI/智能/精准）。
 */
export function majorMatchScore(
  majorVec: MajorVector,
  oppVec: MajorVector,
): MajorMatchResult {
  let dotSum = 0;
  let dominantAxis: Axis = "math";
  let dominantProduct = -1;
  for (const axis of AXES) {
    const product = majorVec[axis] * oppVec[axis];
    dotSum += product;
    if (product > dominantProduct) {
      dominantProduct = product;
      dominantAxis = axis;
    }
  }

  const score = Math.round((dotSum / MAX_POSSIBLE_DOT) * MAJOR_MATCH_MAX_SCORE);
  const clampedScore = clamp(score, 0, MAJOR_MATCH_MAX_SCORE);

  const axisLabel = AXIS_LABEL[dominantAxis];
  const majorAxisValue = majorVec[dominantAxis];
  const oppAxisValue = oppVec[dominantAxis];

  const reason =
    dominantProduct > 0
      ? `你专业${axisLabel}轴(${majorAxisValue.toFixed(1)})×该机会${axisLabel}价值(${oppAxisValue.toFixed(1)})主导匹配，适配度 ${clampedScore}`
      : `专业与机会能力轴整体匹配度较低，适配度 ${clampedScore}`;

  return {
    score: clampedScore,
    dominantAxis,
    reason,
    dotSum,
  };
}

/** 取某 subtype 的机会向量（未覆盖落 other 中性兜底） */
export function getOpportunityVector(subtype: OpportunitySubtype): MajorVector {
  return OPPORTUNITY_VECTORS[subtype] ?? OPPORTUNITY_VECTORS.other!;
}

// ============================================================
// 辅助
// ============================================================

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** 轴中文标签（reason 用，文案合规） */
const AXIS_LABEL: Record<Axis, string> = {
  math: "数理",
  research: "科研",
  clinical: "临床实践",
  engineering: "工程",
  humanities: "人文社科",
  business: "经管商业",
  arts: "艺术创意",
};
