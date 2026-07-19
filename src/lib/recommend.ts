/**
 * 规则化推荐（P4-3，非 AI，从价值矩阵提取）
 *
 * 价值矩阵：VALUE_MATRIX[goal][category] = { stars: 1-3, reason }
 * 数据源：`知识库-成长模型/01-机会价值矩阵.md` 手动结构化。
 *
 * 护栏：复用 searchItems（不写裸 SQL）；文案无 AI/智能/精准；
 *       措辞「根据你的目标推荐」「适合你的机会」「经验参考」。
 */
import type { Goal } from "@/db/schema-enums";
import type { InfoCategory } from "@/db/schema-enums";
import { searchItems } from "@/lib/search";

export interface ValueEntry {
  stars: 1 | 2 | 3; // ★/★★/★★★
  reason: string; // 推荐理由模板
}

// goal × category 价值矩阵（从 01-机会价值矩阵.md 提取，★★★=3/★★=2/★=1）
export const VALUE_MATRIX: Partial<Record<Goal, Partial<Record<InfoCategory, ValueEntry>>>> = {
  baoyan: {
    competition: {
      stars: 3,
      reason: "保研加分显著，国家级高认可竞赛是区分度硬通货",
    },
    research: {
      stars: 3,
      reason: "科研经历是学硕/直博重要区分项，该项目能补充科研背景",
    },
    baoyan: {
      stars: 3,
      reason: "保研目标，夏令营是拿 offer 主路径，建议重点关注",
    },
    scholarship: {
      stars: 2,
      reason: "奖学金是学业证明，保研综合成绩加分",
    },
    internship: {
      stars: 1,
      reason: "专硕/工程类保研有帮助",
    },
  },
  employment: {
    internship: {
      stars: 3,
      reason: "你目标就业，大厂训练营/实习是直通或加分路径",
    },
    competition: {
      stars: 2,
      reason: "竞赛是简历亮点，对口竞赛区分度好",
    },
    research: {
      stars: 2,
      reason: "项目经历对就业有帮助，技术岗尤甚",
    },
    scholarship: {
      stars: 1,
      reason: "部分国企/选调看重学业",
    },
  },
  civilService: {
    scholarship: {
      stars: 2,
      reason: "选调生看重学业成绩与学生工作",
    },
    competition: {
      stars: 1,
      reason: "竞赛丰富简历，部分岗位加分",
    },
  },
  abroad: {
    research: {
      stars: 3,
      reason: "海外申请核心经历，科研产出是关键区分项",
    },
    competition: {
      stars: 2,
      reason: "课外成就是申请加分项",
    },
    scholarship: {
      stars: 2,
      reason: "奖学金证明优秀，海外院校看重",
    },
    internship: {
      stars: 1,
      reason: "实习体现能力证明",
    },
  },
  entrepreneurship: {
    competition: {
      stars: 2,
      reason: "创业竞赛（互联网+/挑战杯）是起步试炼场",
    },
    internship: {
      stars: 2,
      reason: "项目经历有助创业能力积累",
    },
    research: {
      stars: 1,
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
  stars: number;
  reason: string;
}

/**
 * 按用户画像生成推荐
 * - 按 goal 查价值矩阵得高价值 category（★★★ 优先）
 * - 各 category 复用 searchItems 查 top（按认可度/可信度）
 * - 合并 + 去重 + 按价值星级排序
 */
export async function getRecommendations(
  profile: { goal: Goal | null; grade?: string | null; interests?: string[] | null } | null,
  limit = 6,
): Promise<Recommendation[]> {
  if (!profile?.goal) return [];
  const goalMatrix = VALUE_MATRIX[profile.goal];
  if (!goalMatrix) return [];

  // 取该 goal 下所有有价值条目，按星级降序
  const entries = Object.entries(goalMatrix)
    .map(([cat, entry]) => ({
      category: cat as InfoCategory,
      entry: entry as ValueEntry,
    }))
    .sort((a, b) => b.entry.stars - a.entry.stars);

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
        stars: entry.stars,
        reason: entry.reason,
      }));
    }),
  );

  // 合并 + 去重 + 按星级降序
  const seen = new Set<string>();
  const merged: Recommendation[] = [];
  for (const items of results) {
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(it);
    }
  }
  merged.sort((a, b) => b.stars - a.stars);
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
