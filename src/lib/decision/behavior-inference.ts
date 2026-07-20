/**
 * 行为推断校准（Phase A 4.5 第2小步）
 *
 * 据用户收藏/浏览行为算：
 *  1. 推断能力档位（收藏过国家级竞赛→competitionCapability 推断 provincial/national 等）。
 *  2. 同机会重复标记（收藏/浏览过某 subtype N 次→该 subtype 重复）。
 *
 * 规则结构化（行为类型→维度/subtype 映射，nit-18），非 if 硬编码，可扩展。
 * 与自评冲突时**不覆盖自评只提示**（用户定义>系统推理，可解释不武断）。
 *
 * 护栏：不引 AI；行为推断是辅助非裁决；文案禁 AI/智能/精准。
 */
import { inferSubtype, type OpportunitySubtype } from "@/lib/knowledge/opportunity-knowledge";
import type { InfoCategory } from "@/db/schema-enums";
import type {
  GpaTier,
  ResearchLevel,
  CompetitionCapability,
  EnglishLevel,
  InternshipLevel,
  Goal,
} from "@/db/schema-enums";

/** 用户行为记录（收藏/浏览的机会） */
export interface BehaviorRecord {
  title: string;
  category: InfoCategory;
  /** 行为类型：favorite 收藏 / view 浏览 */
  type: "favorite" | "view";
}

/** 推断的能力档位（与自评对比用） */
export interface InferredCapability {
  gpaTier?: GpaTier;
  researchLevel?: ResearchLevel;
  competitionCapability?: CompetitionCapability;
  englishLevel?: EnglishLevel;
  internshipLevel?: InternshipLevel;
}

/** 行为推断结果 */
export interface BehaviorInference {
  /** 推断能力档位 */
  inferred: InferredCapability;
  /** 重复 subtype 标记（收藏/浏览过 ≥2 次的 subtype） */
  repeatedSubtypes: OpportunitySubtype[];
  /** 与自评冲突提示（不覆盖，只提示用户确认） */
  conflicts: { axis: string; selfValue: string; inferredValue: string; hint: string }[];
}

/** 行为→能力维度映射规则（结构化，nit-18，可扩展） */
interface BehaviorRule {
  /** 匹配的 subtype */
  subtype: OpportunitySubtype;
  /** 推断的能力维度 */
  axis: keyof InferredCapability;
  /** 推断档位 */
  value: string;
  /** 触发阈值（行为次数 ≥ 此值才推断） */
  threshold: number;
}

// 规则表：某 subtype 行为 ≥ N 次 → 推断对应能力档位（经验参考）
const BEHAVIOR_RULES: BehaviorRule[] = [
  { subtype: "acm", axis: "competitionCapability", value: "provincial", threshold: 1 },
  { subtype: "math-modeling", axis: "competitionCapability", value: "provincial", threshold: 1 },
  { subtype: "research", axis: "researchLevel", value: "project", threshold: 1 },
  { subtype: "dachuang", axis: "researchLevel", value: "project", threshold: 1 },
  { subtype: "ai-training-camp", axis: "internshipLevel", value: "has", threshold: 1 },
  { subtype: "clinical-internship", axis: "internshipLevel", value: "has", threshold: 1 },
  // 雅思托福机会收藏 → 英语推断 cet（收藏即关注，至少在准备）
  { subtype: "baoyan-camp", axis: "englishLevel", value: "cet", threshold: 2 },
];

/** 重复标记阈值（同 subtype 行为 ≥ 此值 → 重复） */
const REPEAT_THRESHOLD = 1;

/**
 * 行为推断主入口：据收藏/浏览记录算推断能力 + 重复 subtype + 冲突提示。
 *
 * @param behaviors 用户行为记录（收藏+浏览）
 * @param selfAssessed 用户自评能力（与推断对比，冲突只提示不覆盖）
 */
export function inferFromBehaviors(
  behaviors: BehaviorRecord[],
  selfAssessed?: InferredCapability,
): BehaviorInference {
  // 1. 按 subtype 统计行为次数
  const subtypeCounts = new Map<OpportunitySubtype, number>();
  for (const b of behaviors) {
    const sub = inferSubtype(b.category, b.title);
    subtypeCounts.set(sub, (subtypeCounts.get(sub) ?? 0) + 1);
  }

  // 2. 推断能力档位（按 BEHAVIOR_RULES，达阈值才推断）
  const inferred: InferredCapability = {};
  for (const rule of BEHAVIOR_RULES) {
    const count = subtypeCounts.get(rule.subtype) ?? 0;
    if (count >= rule.threshold) {
      // 已推断则取更高档（多次行为升级推断）
      const existing = inferred[rule.axis];
      if (!existing || shouldUpgrade(existing, rule.value)) {
        inferred[rule.axis] = rule.value as never;
      }
    }
  }

  // 3. 重复 subtype 标记（同 subtype ≥ REPEAT_THRESHOLD → 重复）
  const repeatedSubtypes: OpportunitySubtype[] = [];
  for (const [sub, count] of subtypeCounts) {
    if (count >= REPEAT_THRESHOLD + 1) {
      // ≥2 次同 subtype → 重复（已有此类成果关注）
      repeatedSubtypes.push(sub);
    }
  }

  // 4. 与自评冲突提示（不覆盖只提示）
  const conflicts: BehaviorInference["conflicts"] = [];
  if (selfAssessed) {
    for (const axis of Object.keys(inferred) as (keyof InferredCapability)[]) {
      const inferredValue = inferred[axis];
      const selfValue = selfAssessed[axis];
      if (inferredValue && selfValue && inferredValue !== selfValue) {
        conflicts.push({
          axis,
          selfValue: String(selfValue),
          inferredValue: String(inferredValue),
          hint: conflictHint(axis, String(selfValue), String(inferredValue)),
        });
      }
    }
  }

  return { inferred, repeatedSubtypes, conflicts };
}

/** 推断档位是否比现有更高（升级推断用） */
function shouldUpgrade(existing: string, candidate: string): boolean {
  const order = ["none", "has", "cet", "ielts_toefl", "project", "paper", "provincial", "national", "top50", "top20", "top5"];
  return order.indexOf(candidate) > order.indexOf(existing);
}

/** 冲突提示文案（不覆盖自评，措辞合规） */
function conflictHint(axis: string, selfValue: string, inferredValue: string): string {
  const axisLabel: Record<string, string> = {
    gpaTier: "GPA 档位",
    researchLevel: "科研经历",
    competitionCapability: "竞赛水平",
    englishLevel: "英语水平",
    internshipLevel: "实习经历",
  };
  return `你自评${axisLabel[axis] ?? axis}为 ${selfValue}，但行为显示可能在 ${inferredValue} 水平，是否需要更新？`;
}

void (null as unknown as Goal); // 类型占位（避免未用导入，Goal 后续扩展用）
