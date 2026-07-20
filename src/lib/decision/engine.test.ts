/**
 * 决策引擎 7 步推理链 — 单元测试（铁律⑦验证驱动）
 *
 * 硬指标（B 第 41 条）：南航 AI 大一保研 decide() 排序 = 科研>ACM>数模>夏令营末位（ACM=73>数模=63）。
 * 验证偏差1/2 已解决：ACM→acm subtype→S→majorMatch+25；犀牛鸟→ai-training-camp→A→+10。
 */
import { describe, expect, it } from "vitest";

import {
  decide,
  judgeGrowthStage,
  analyzeGoal,
} from "./engine";
import type { DecisionProfile, DecisionOpportunity } from "./factors";

const NOW = new Date("2026-07-20T00:00:00Z");

/** 南航 AI 大一保研画像 */
const NUAA_AI_FRESHMAN_BAOYAN: DecisionProfile = {
  goal: "baoyan",
  schoolTier: "c211",
  majorDirection: "ai_general",
  grade: "freshman",
};

function opp(over: Partial<DecisionOpportunity> = {}): DecisionOpportunity {
  return {
    id: "test",
    title: "测试",
    category: "competition",
    level: "national",
    recognition: "official_A",
    signUpEnd: null,
    ...over,
  };
}

describe("judgeGrowthStage（步骤1）", () => {
  it("freshman → 探索", () => {
    expect(judgeGrowthStage("freshman")).toBe("探索");
  });
  it("sophomore → 建设", () => {
    expect(judgeGrowthStage("sophomore")).toBe("建设");
  });
  it("junior → 冲刺", () => {
    expect(judgeGrowthStage("junior")).toBe("冲刺");
  });
  it("senior → 收尾", () => {
    expect(judgeGrowthStage("senior")).toBe("收尾");
  });
  it("null → null", () => {
    expect(judgeGrowthStage(null)).toBeNull();
  });
});

describe("analyzeGoal（步骤2）", () => {
  it("保研 → 高价值 category 按 tier 降序（S 在前）", () => {
    const cats = analyzeGoal("baoyan");
    expect(cats.length).toBeGreaterThan(0);
    // 前几个应是 S 级（competition/research/baoyan）
    expect(cats[0]!.tier).toBe("S");
  });
});

describe("decide() 硬指标：南航 AI 大一保研（偏差解决验证）", () => {
  // 真实数据候选（与 DB 现有数据一致）
  const candidates: DecisionOpportunity[] = [
    opp({
      id: "research-1",
      title: "国家级大学生创新创业训练计划",
      category: "research",
      level: "national",
      recognition: "normal",
    }),
    opp({
      id: "acm",
      title: "ACM-ICPC 国际大学生程序设计竞赛",
      category: "competition",
      level: "international",
      recognition: "official_A",
    }),
    opp({
      id: "math-modeling",
      title: "全国大学生数学建模竞赛",
      category: "competition",
      level: "national",
      recognition: "official_A",
    }),
    opp({
      id: "challenge-cup",
      title: "挑战杯全国大学生课外学术科技作品竞赛",
      category: "competition",
      level: "national",
      recognition: "official_A",
    }),
    opp({
      id: "lanqiao",
      title: "蓝桥杯全国软件和信息技术专业人才大赛",
      category: "competition",
      level: "national",
      recognition: "official_A",
    }),
    opp({
      id: "xiniuniao",
      title: "腾讯犀牛鸟开源人才培养计划",
      category: "internship",
      level: "school",
      recognition: "normal",
    }),
    opp({
      id: "beida-camp",
      title: "北京大学优秀大学生夏令营",
      category: "baoyan",
      level: "school",
      recognition: "normal",
    }),
  ];

  let results: Awaited<ReturnType<typeof decide>>;

  it("decide() 返回全部候选（7 条）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    expect(results.length).toBe(7);
  });

  it("ACM fitScore = 73（inferSubtype→acm→S→majorMatch+25，偏差1 解决）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const acm = results.find((r) => r.recommendation.id === "acm")!;
    expect(acm.fitScore).toBe(73); // 30+25+15+0+3-0
  });

  it("科研 fitScore = 81（首位）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const research = results.find((r) => r.recommendation.id === "research-1")!;
    expect(research.fitScore).toBe(81);
  });

  it("数模 fitScore = 63", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const mm = results.find((r) => r.recommendation.id === "math-modeling")!;
    expect(mm.fitScore).toBe(63);
  });

  it("北大夏令营 fitScore = 44（末位区，owner 痛点②）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const camp = results.find((r) => r.recommendation.id === "beida-camp")!;
    expect(camp.fitScore).toBe(44); // 30+25-15-8+12-0
  });

  it("犀牛鸟 majorMatch 知识库 tier A（inferSubtype→ai-training-camp，偏差2 解决）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const x = results.find((r) => r.recommendation.id === "xiniuniao")!;
    // majorMatch 应 = MAJOR_TIER_SCORE.A = 10（ai-training-camp subtype）
    const mm = x.factors.find((f) => f.name === "majorMatch")!;
    expect(mm.score).toBe(10);
  });

  it("排序 = 科研(81) > ACM(73) > 数模(63) > 夏令营(末位区) —— owner 期待序成立", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const ranks = results.map((r) => ({
      id: r.recommendation.id,
      fitScore: r.fitScore,
      rank: r.rank,
    }));
    const acm = ranks.find((r) => r.id === "acm")!;
    const mm = ranks.find((r) => r.id === "math-modeling")!;
    expect(acm.fitScore).toBeGreaterThan(mm.fitScore); // ACM > 数模（偏差解决）
    expect(acm.rank).toBeLessThan(mm.rank); // ACM 排在数模前
    // 首位是科研
    expect(results[0]!.recommendation.id).toBe("research-1");
    // 夏令营排在数模之后（末位区，fitScore 最低的之一）
    const camp = ranks.find((r) => r.id === "beida-camp")!;
    expect(camp.fitScore).toBe(44);
    expect(camp.rank).toBeGreaterThan(mm.rank); // 夏令营排数模后
  });

  it("每条 DecisionResult 含 6 因子 + tier + reason（非空，铁律②/⑧）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    for (const r of results) {
      expect(r.factors.length).toBe(6);
      expect(["S", "A", "B"]).toContain(r.tier);
      expect(r.reason).toBeTruthy();
      expect(r.reason.length).toBeGreaterThan(0);
    }
  });

  it("reason 措辞合规（无 AI/智能/精准）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    for (const r of results) {
      expect(r.reason).not.toMatch(/AI认为|智能分析|精准匹配|系统觉得/);
    }
  });

  it("growthStage = 探索（大一）", async () => {
    results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    for (const r of results) {
      expect(r.growthStage).toBe("探索");
    }
  });
});

describe("decide() 场景4：南航 AI 大三保研（夏令营升首位区）", () => {
  const JUNIOR: DecisionProfile = { ...NUAA_AI_FRESHMAN_BAOYAN, grade: "junior" };
  const candidates: DecisionOpportunity[] = [
    opp({
      id: "research-1",
      title: "国家级大学生创新创业训练计划",
      category: "research",
      level: "national",
      recognition: "normal",
    }),
    opp({
      id: "beida-camp",
      title: "北京大学优秀大学生夏令营",
      category: "baoyan",
      level: "school",
      recognition: "normal",
    }),
  ];

  it("大三夏令营 fitScore = 79（gradeFit 冲刺 +20，升首位区）", async () => {
    const results = await decide(JUNIOR, candidates, NOW);
    const camp = results.find((r) => r.recommendation.id === "beida-camp")!;
    expect(camp.fitScore).toBe(79); // 30+25+20-8+12-0
  });

  it("大三夏令营 gradeFit factor = +20（冲刺期）", async () => {
    const results = await decide(JUNIOR, candidates, NOW);
    const camp = results.find((r) => r.recommendation.id === "beida-camp")!;
    const gf = camp.factors.find((f) => f.name === "gradeFit")!;
    expect(gf.score).toBe(20);
  });
});

describe("decide() 场景3：南航经管大一保研（走 base 不退化）", () => {
  const JINGGUAN: DecisionProfile = {
    goal: "baoyan",
    schoolTier: "c211",
    majorDirection: "business_general",
    grade: "freshman",
  };
  const candidates: DecisionOpportunity[] = [
    opp({
      id: "acm",
      title: "ACM-ICPC 国际大学生程序设计竞赛",
      category: "competition",
      level: "international",
      recognition: "official_A",
    }),
    opp({
      id: "math-modeling",
      title: "全国大学生数学建模竞赛",
      category: "competition",
      level: "national",
      recognition: "official_A",
    }),
  ];

  it("经管 majorMatch = 0（非 AI 走 base，不退化）", async () => {
    const results = await decide(JINGGUAN, candidates, NOW);
    for (const r of results) {
      const mm = r.factors.find((f) => f.name === "majorMatch")!;
      expect(mm.score).toBe(0);
    }
  });

  it("经管场景 ACM 不高于数模（base 下 schoolFit 差异：ACM international=0 < 数模 national=+3）", async () => {
    const results = await decide(JINGGUAN, candidates, NOW);
    const acm = results.find((r) => r.recommendation.id === "acm")!;
    const mm = results.find((r) => r.recommendation.id === "math-modeling")!;
    expect(mm.fitScore).toBeGreaterThanOrEqual(acm.fitScore); // 数模 >= ACM（不错配）
  });
});
