/**
 * 规则化推荐（P4-3，非 AI，从价值矩阵提取）
 *
 * 价值矩阵：VALUE_MATRIX[goal][category] = { tier: S/A/B, reason }
 * 数据源：`知识库-成长模型/01-机会价值矩阵.md` 手动结构化。
 *
 * Phase A 升级（B 第 36 条疑点 3 拍板）：
 *  - 退役 stars，改用 tier（S/A/B）。详情页与推荐列表统一 tier，避免双轨（铁律②）。
 *  - majorReason：专业方向专属理由（至少 AI 类），majorMatch 因子查询 knowledge 库的 tier，
 *    reason 用于个性化文案。Phase A 打通 AI 保研，其余方向走 base。
 *  - 注：getRecommendations 当前仍按 goal×category tier 取候选（向后兼容），
 *    Phase A 第三步 decision engine 接管后，本函数将改为调 decision engine。
 *
 * 护栏：复用 searchItems（不写裸 SQL）；文案无 AI/智能/精准；
 *       措辞「根据你的目标推荐」「适合你的机会」「经验参考」。
 */
import type { Goal } from "@/db/schema-enums";
import type { InfoCategory } from "@/db/schema-enums";
import { searchItems } from "@/lib/search";

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
  /** Phase A：tier 替代 stars（向后兼容期，第三步 decision engine 接管后改 fitScore 主排序） */
  tier: "S" | "A" | "B";
  /** @deprecated Phase A 退役 stars，保留只为 dashboard RecommendItem 过渡（第三步移除） */
  stars: number;
  reason: string;
}

/**
 * 按用户画像生成推荐
 * - 按 goal 查价值矩阵得高价值 category（S 优先）
 * - 各 category 复用 searchItems 查 top（按认可度/可信度）
 * - 合并 + 去重 + 按价值 tier 排序
 *
 * Phase A 过渡：本函数暂保留，第三步 decision engine 接管后改为调 decide()。
 */
export async function getRecommendations(
  profile: { goal: Goal | null; grade?: string | null; interests?: string[] | null } | null,
  limit = 6,
): Promise<Recommendation[]> {
  if (!profile?.goal) return [];
  const goalMatrix = VALUE_MATRIX[profile.goal];
  if (!goalMatrix) return [];

  const tierRank: Record<"S" | "A" | "B", number> = { S: 3, A: 2, B: 1 };

  // 取该 goal 下所有有价值条目，按 tier 降序
  const entries = Object.entries(goalMatrix)
    .map(([cat, entry]) => ({
      category: cat as InfoCategory,
      entry: entry as ValueEntry,
    }))
    .sort((a, b) => tierRank[b.entry.tier] - tierRank[a.entry.tier]);

  // 各 category 查 top 2（复用 searchItems，护栏2）
  const results = await Promise.all(
    entries.map(async ({ category, entry }) => {
      const r = await searchItems({
        filters: { category },
        sort: { by: "credibility" },
        pageSize: 2,
      });
      return r.hits.map((h) => ({
        id: h.id,
        title: h.title,
        summary: h.summary,
        category: h.category as InfoCategory,
        credibilityScore: h.credibilityScore,
        signUpEnd: h.signUpEnd,
        level: h.level,
        tier: entry.tier,
        stars: tierRank[entry.tier], // 过渡兼容（第三步移除）
        reason: entry.reason,
      }));
    }),
  );

  // 合并 + 去重 + 按 tier 降序
  const seen = new Set<string>();
  const merged: Recommendation[] = [];
  for (const items of results) {
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(it);
    }
  }
  merged.sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);
  return merged.slice(0, limit);
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
