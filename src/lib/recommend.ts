/**
 * 推荐入口（Phase A 4.4：改调 decision engine decide()，退役枚举版）。
 *
 * 价值矩阵：VALUE_MATRIX[goal][category] = { tier: S/A/B, reason }（base 维度，goalMatch 用）。
 * 数据源：`知识库-成长模型/01-机会价值矩阵.md` 手动结构化。
 *
 * Phase A 4.4 升级（B 第 48 条）：
 *  - getRecommendations 改调 decide()（decision engine 7 步推理链，向量版 majorMatch）。
 *  - Recommendation 去 stars（nit-9 退役），改 {tier, fitScore, reason, factors}。
 *  - 候选来源复用 searchItems（护栏2，engine 不写裸 SQL）。
 *
 * 护栏：复用 searchItems（不写裸 SQL）；文案无 AI/智能/精准；
 *       措辞「根据你的目标推荐」「适合你的机会」「经验参考」。
 */
import type { Goal, GoalGrade, InfoCategory, MajorDirection, SchoolTier } from "@/db/schema-enums";
import { searchItems } from "@/lib/search";
import { decide, analyzeGoal } from "@/lib/decision/engine";
import type { DecisionProfile, DecisionOpportunity } from "@/lib/decision/factors";

export interface ValueEntry {
  tier: "S" | "A" | "B"; // 价值分层（Phase A 替代 stars）
  reason: string; // 通用理由（goal×category）
  majorReason?: Partial<Record<string, string>>; // 专业方向专属理由（MajorDirection key）
}

// goal × category 价值矩阵（从 01-机会价值矩阵.md 提取，tier 取代 stars）
// tier: S=核心区分度 / A=显著有帮助 / B=补充。majorReason 至少补 AI 类。
export const VALUE_MATRIX: Partial<Record<Goal, Partial<Record<InfoCategory, ValueEntry>>>> = {
  baoyan: {
    competition: {
      tier: "S",
      reason: "保研加分显著，国家级高认可竞赛是区分度硬通货",
      majorReason: {
        ai_general: "AI 院系筛选看重算法与工程能力，ACM 是 S 级核心",
        ai_cv: "AI 院系筛选看重算法与工程能力，ACM 是 S 级核心",
        ai_nlp: "AI 院系筛选看重算法与工程能力，ACM 是 S 级核心",
        ai_llm: "AI 院系筛选看重算法与工程能力，ACM 是 S 级核心",
        ai_robotics: "AI 院系筛选看重算法与工程能力，ACM 是 S 级核心",
      },
    },
    research: {
      tier: "S",
      reason: "科研经历是学硕/直博重要区分项，该项目能补充科研背景",
      majorReason: {
        ai_general: "AI 保研核心区分度，科研产出是学硕/直博硬通货",
        ai_cv: "AI 保研核心区分度，CV 方向顶会产出是硬通货",
        ai_nlp: "AI 保研核心区分度，NLP 方向顶会产出是硬通货",
        ai_llm: "AI 保研核心区分度，大模型方向科研/开源产出是硬通货",
        ai_robotics: "AI 保研核心区分度，具身/控制方向科研产出是硬通货",
      },
    },
    baoyan: {
      tier: "S",
      reason: "保研目标，夏令营是拿 offer 主路径，建议重点关注",
      majorReason: {
        ai_general: "大三当期投递夏令营是 AI 保研拿 offer 主路径",
      },
    },
    scholarship: {
      tier: "A",
      reason: "奖学金是学业证明，保研综合成绩加分",
    },
    internship: {
      tier: "B",
      reason: "专硕/工程类保研有帮助",
    },
  },
  employment: {
    internship: {
      tier: "S",
      reason: "你目标就业，大厂训练营/实习是直通或加分路径",
    },
    competition: {
      tier: "A",
      reason: "竞赛是简历亮点，对口竞赛区分度好",
    },
    research: {
      tier: "A",
      reason: "项目经历对就业有帮助，技术岗尤甚",
    },
    scholarship: {
      tier: "B",
      reason: "部分国企/选调看重学业",
    },
  },
  civilService: {
    scholarship: {
      tier: "A",
      reason: "选调生看重学业成绩与学生工作",
    },
    competition: {
      tier: "B",
      reason: "竞赛丰富简历，部分岗位加分",
    },
  },
  abroad: {
    research: {
      tier: "S",
      reason: "海外申请核心经历，科研产出是关键区分项",
    },
    competition: {
      tier: "A",
      reason: "课外成就是申请加分项",
    },
    scholarship: {
      tier: "A",
      reason: "奖学金证明优秀，海外院校看重",
    },
    internship: {
      tier: "B",
      reason: "实习体现能力证明",
    },
  },
  entrepreneurship: {
    competition: {
      tier: "A",
      reason: "创业竞赛（互联网+/挑战杯）是起步试炼场",
    },
    internship: {
      tier: "A",
      reason: "项目经历有助创业能力积累",
    },
    research: {
      tier: "B",
      reason: "科研经历对技术创业有帮助",
    },
  },
};

export interface Recommendation {
  id: string;
  title: string;
  summary: string | null;
  category: InfoCategory;
  credibilityScore: string | null;
  signUpEnd: Date | null;
  level: string | null;
  /** Phase A 4.4：tier（来自 decision engine，S/A/B） */
  tier: "S" | "A" | "B";
  /** 适配度总分（decision engine fitScore） */
  fitScore: number;
  /** 个性化理由（factors 聚合，profile 驱动，非静态模板） */
  reason: string;
  /** 6 因子三元组（铁律②可展开，UI 可点开看全貌） */
  factors?: { name: string; score: number; reason: string; source: string }[];
  /** 排名（1-based） */
  rank?: number;
}

/**
 * 按用户画像生成推荐（Phase A 4.4：改调 decision engine decide()，退役枚举版）。
 *
 * 流程：
 * 1. analyzeGoal(goal) 取该 goal 下高价值 category（tier 降序）
 * 2. 各 category 复用 searchItems 查 top 候选（护栏2，不写裸 SQL）
 * 3. decide(profile, candidates) 跑 7 步推理链 → DecisionResult[]
 * 4. 映射为 Recommendation[]（带 tier/fitScore/reason/factors）
 *
 * 护栏：复用 searchItems（不写裸 SQL）；文案无 AI/智能/精准；
 *       措辞「根据你的目标推荐」「适合你的机会」「经验参考」。
 */
export async function getRecommendations(
  profile:
    | {
        goal: Goal | null;
        schoolTier?: string | null;
        majorDirection?: string | null;
        major?: string | null;
        grade?: GoalGrade | null;
        interests?: string[] | null;
      }
    | null,
  limit = 6,
): Promise<Recommendation[]> {
  if (!profile?.goal) return [];

  // 1. 取该 goal 下高价值 category
  const goalCats = analyzeGoal(profile.goal);
  if (goalCats.length === 0) return [];

  // 2. 各 category 复用 searchItems 查候选（护栏2，不写裸 SQL）
  const results = await Promise.all(
    goalCats.map(async ({ category }) => {
      const r = await searchItems({
        filters: { category },
        sort: { by: "credibility" },
        pageSize: 3,
      });
      return r.hits;
    }),
  );
  // 合并 + 去重（保留 hit 原始字段 summary/credibilityScore 供 Recommendation 用）
  const seen = new Set<string>();
  const candidateHits: {
    id: string;
    title: string;
    summary: string | null;
    category: string;
    credibilityScore: string | null;
    signUpEnd: Date | null;
    level: string | null;
  }[] = [];
  for (const items of results) {
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      candidateHits.push(it);
    }
  }

  // 转 DecisionOpportunity（level 需 cast 为 CompetitionLevel）
  const candidates: DecisionOpportunity[] = candidateHits.map((h) => ({
    id: h.id,
    title: h.title,
    category: h.category as InfoCategory,
    level: h.level as DecisionOpportunity["level"],
    recognition: undefined,
    signUpEnd: h.signUpEnd,
  }));

  // 3. decision engine 跑 7 步推理链
  const decisionProfile: DecisionProfile = {
    goal: profile.goal,
    schoolTier: (profile.schoolTier as SchoolTier | null) ?? null,
    majorDirection: (profile.majorDirection as MajorDirection | null) ?? null,
    majorText: profile.major ?? null,
    grade: profile.grade ?? null,
  };
  const decisionResults = await decide(decisionProfile, candidates);

  // 4. 映射为 Recommendation[]
  return decisionResults.slice(0, limit).map((dr) => {
    const hit = candidateHits.find((c) => c.id === dr.recommendation.id);
    return {
      id: dr.recommendation.id,
      title: dr.recommendation.title,
      summary: hit?.summary ?? null,
      category: dr.recommendation.category,
      credibilityScore: hit?.credibilityScore ?? null,
      signUpEnd: dr.recommendation.signUpEnd ?? null,
      level: dr.recommendation.level ?? null,
      tier: dr.tier,
      fitScore: dr.fitScore,
      reason: dr.reason,
      factors: dr.factors,
      rank: dr.rank,
    };
  });
}

/** 推荐理由前缀（措辞合规，无 AI/智能/精准） */
export function recommendReasonPrefix(goal: Goal): string {
  const labels: Record<Goal, string> = {
    baoyan: "保研目标",
    employment: "就业目标",
    civilService: "考公目标",
    abroad: "出国目标",
    entrepreneurship: "创业目标",
  };
  return labels[goal];
}
