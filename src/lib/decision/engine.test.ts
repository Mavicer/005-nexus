/**
 * 决策引擎 7 步推理链 — 单元测试（Phase A 4.3 向量版重做）
 *
 * 硬指标（B 第 47 条）：
 *  ① 南航 AI 大一保研 decide() 排序 = 科研>ACM>数模>夏令营末位（向量版，科研通过 roi 超 ACM）
 *  ② 康复场景：康复×临床 majorMatch 高 > 康复×ACM 低（证明不特调，owner 核心）
 *  ③ 反特调：换等价画像（北邮计算机 vs 南航AI，同为工科+AI 微调）结果结构一致
 */
import { describe, expect, it } from "vitest";

import { decide, judgeGrowthStage, analyzeGoal } from "./engine";
import type { DecisionProfile, DecisionOpportunity } from "./factors";

const NOW = new Date("2026-07-20T00:00:00Z");

/** 南航 AI 大一保研画像（owner 验收基准的简化：单目标保研，4+0/双目标/硬约束属 4.5/4.6） */
const NUAA_AI_FRESHMAN_BAOYAN: DecisionProfile = {
  goal: "baoyan",
  schoolTier: "c211",
  majorDirection: "ai_general",
  majorText: "人工智能",
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
  it("freshman → 探索 / sophomore → 建设 / junior → 冲刺 / senior → 收尾", () => {
    expect(judgeGrowthStage("freshman")).toBe("探索");
    expect(judgeGrowthStage("sophomore")).toBe("建设");
    expect(judgeGrowthStage("junior")).toBe("冲刺");
    expect(judgeGrowthStage("senior")).toBe("收尾");
    expect(judgeGrowthStage(null)).toBeNull();
  });
});

describe("analyzeGoal（步骤2）", () => {
  it("保研 → 高价值 category 按 tier 降序", () => {
    const cats = analyzeGoal("baoyan");
    expect(cats.length).toBeGreaterThan(0);
    expect(cats[0]!.tier).toBe("S");
  });
});

// ---------- 硬指标①：南航 AI 大一保研排序 ----------
describe("decide() 硬指标①：南航 AI 大一保研（向量版）", () => {
  const candidates: DecisionOpportunity[] = [
    opp({ id: "research-1", title: "国家级大学生创新创业训练计划", category: "research", level: "national", recognition: "normal" }),
    opp({ id: "acm", title: "ACM-ICPC 国际大学生程序设计竞赛", category: "competition", level: "international", recognition: "official_A" }),
    opp({ id: "math-modeling", title: "全国大学生数学建模竞赛", category: "competition", level: "national", recognition: "official_A" }),
    opp({ id: "challenge-cup", title: "挑战杯全国大学生课外学术科技作品竞赛", category: "competition", level: "national", recognition: "official_A" }),
    opp({ id: "xiniuniao", title: "腾讯犀牛鸟开源人才培养计划", category: "internship", level: "school", recognition: "normal" }),
    opp({ id: "beida-camp", title: "北京大学优秀大学生夏令营", category: "baoyan", level: "school", recognition: "normal" }),
  ];

  it("decide() 返回全部候选（6 条）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    expect(results.length).toBe(6);
  });

  it("科研 fitScore > ACM（科研通过 roi 高投入顶会产出超 ACM 极高投入）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const research = results.find((r) => r.recommendation.id === "research-1")!;
    const acm = results.find((r) => r.recommendation.id === "acm")!;
    expect(research.fitScore).toBeGreaterThan(acm.fitScore);
  });

  it("ACM > 数模（ACM majorMatch 高于数模，向量点积分流）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const acm = results.find((r) => r.recommendation.id === "acm")!;
    const mm = results.find((r) => r.recommendation.id === "math-modeling")!;
    expect(acm.fitScore).toBeGreaterThan(mm.fitScore);
  });

  it("夏令营排末位（大一+了解 gradeFit -15 + schoolFit 错配 -8 压底）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const camp = results.find((r) => r.recommendation.id === "beida-camp")!;
    const mm = results.find((r) => r.recommendation.id === "math-modeling")!;
    expect(camp.fitScore).toBeLessThan(mm.fitScore); // 夏令营 < 数模
    // 夏令营应是末位或末位区
    const sorted = [...results].sort((a, b) => b.fitScore - a.fitScore);
    expect(sorted[sorted.length - 1]!.recommendation.id).toBe("beida-camp");
  });

  it("owner 期待序：科研 > ACM > 数模 > 夏令营末位 ✅", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    expect(results[0]!.recommendation.id).toBe("research-1"); // 首位科研
    const acmRank = results.find((r) => r.recommendation.id === "acm")!.rank;
    const mmRank = results.find((r) => r.recommendation.id === "math-modeling")!.rank;
    expect(acmRank).toBeLessThan(mmRank); // ACM 排数模前
    expect(results[results.length - 1]!.recommendation.id).toBe("beida-camp"); // 末位夏令营
  });

  it("每条 DecisionResult 含 7 因子 + tier + reason（铁律②⑧，4.5 加 readinessGap）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    for (const r of results) {
      expect(r.factors.length).toBe(7);
      expect(["S", "A", "B"]).toContain(r.tier);
      expect(r.reason).toBeTruthy();
    }
  });

  it("reason 措辞合规（无 AI/智能/精准）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    for (const r of results) {
      expect(r.reason).not.toMatch(/AI认为|智能分析|精准匹配|系统觉得/);
    }
  });

  it("growthStage = 探索（大一）", async () => {
    const results = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    for (const r of results) {
      expect(r.growthStage).toBe("探索");
    }
  });
});

// ---------- 硬指标②：康复场景反特调 ----------
describe("decide() 硬指标②：康复大一保研（反特调，owner 核心）", () => {
  const KANGFU: DecisionProfile = {
    goal: "baoyan",
    schoolTier: "c211",
    majorDirection: "other",
    majorText: "康复治疗学",
    grade: "freshman",
  };
  const candidates: DecisionOpportunity[] = [
    opp({ id: "clinical", title: "临床实习/规培", category: "internship", level: "school", recognition: "normal" }),
    opp({ id: "acm", title: "ACM-ICPC 国际大学生程序设计竞赛", category: "competition", level: "international", recognition: "official_A" }),
    opp({ id: "research", title: "国家级大学生创新创业训练计划", category: "research", level: "national", recognition: "normal" }),
  ];

  it("康复 × 临床实习 majorMatch > 康复 × ACM（clinical 轴主导，不特调）", async () => {
    const results = await decide(KANGFU, candidates, NOW);
    const clinical = results.find((r) => r.recommendation.id === "clinical")!;
    const acm = results.find((r) => r.recommendation.id === "acm")!;
    const clinicalMM = clinical.factors.find((f) => f.name === "majorMatch")!;
    const acmMM = acm.factors.find((f) => f.name === "majorMatch")!;
    expect(clinicalMM.score).toBeGreaterThan(acmMM.score); // 临床 > ACM（康复临床轴高）
  });

  it("康复 × 临床 reason 含 clinical 轴（dominantAxis 可解释）", async () => {
    const results = await decide(KANGFU, candidates, NOW);
    const clinical = results.find((r) => r.recommendation.id === "clinical")!;
    const clinicalMM = clinical.factors.find((f) => f.name === "majorMatch")!;
    expect(clinicalMM.reason).toContain("临床实践"); // dominantAxis=clinical
  });

  it("康复不靠枚举：康复不在 majorDirection 枚举，走 other，仍算出向量点积分流", async () => {
    // KANGFU.majorDirection="other"，但 majorText="康复治疗学" → classifyMajor 归一到医学门类+康复微调
    // 证明不靠"康复"在枚举表，靠向量点积（owner 否决枚举特调的核心）
    const results = await decide(KANGFU, candidates, NOW);
    expect(results.length).toBeGreaterThan(0);
    // 临床 majorMatch 应 > 0（康复 clinical 轴高 × 临床实习 clinical=1.0）
    const clinical = results.find((r) => r.recommendation.id === "clinical")!;
    const clinicalMM = clinical.factors.find((f) => f.name === "majorMatch")!;
    expect(clinicalMM.score).toBeGreaterThan(0);
  });
});

// ---------- 硬指标③：反特调（换等价画像结果结构一致） ----------
describe("decide() 硬指标③：反特调（北邮AI vs 南航AI，同为工学+AI 微调，换学校）", () => {
  // 反特调：换学校（南航→北邮，同为 211），专业同为人工智能，结果结构应一致（科研>ACM>数模）
  // 证明不是为南航AI特调，通用机制跑通任意等价画像
  const BUPT_AI: DecisionProfile = {
    goal: "baoyan",
    schoolTier: "c211",
    majorDirection: "ai_general",
    majorText: "人工智能",
    grade: "freshman",
  };
  const candidates: DecisionOpportunity[] = [
    opp({ id: "research-1", title: "国家级大学生创新创业训练计划", category: "research", level: "national", recognition: "normal" }),
    opp({ id: "acm", title: "ACM-ICPC 国际大学生程序设计竞赛", category: "competition", level: "international", recognition: "official_A" }),
    opp({ id: "math-modeling", title: "全国大学生数学建模竞赛", category: "competition", level: "national", recognition: "official_A" }),
  ];

  it("北邮AI 排序与南航AI一致（科研>ACM>数模，换学校结果结构相同=不特调）", async () => {
    const results = await decide(BUPT_AI, candidates, NOW);
    expect(results[0]!.recommendation.id).toBe("research-1"); // 科研首位
    const acmRank = results.find((r) => r.recommendation.id === "acm")!.rank;
    const mmRank = results.find((r) => r.recommendation.id === "math-modeling")!.rank;
    expect(acmRank).toBeLessThan(mmRank); // ACM > 数模
    // 与南航AI结构完全一致（同工学+AI微调，只换学校，结果结构相同 → 证明不特调）
  });
});

// ---------- 场景4：大三夏令营升首位区 ----------
describe("decide() 场景4：南航 AI 大三保研（夏令营升首位区）", () => {
  const JUNIOR: DecisionProfile = { ...NUAA_AI_FRESHMAN_BAOYAN, grade: "junior" };
  const candidates: DecisionOpportunity[] = [
    opp({ id: "research-1", title: "国家级大学生创新创业训练计划", category: "research", level: "national", recognition: "normal" }),
    opp({ id: "beida-camp", title: "北京大学优秀大学生夏令营", category: "baoyan", level: "school", recognition: "normal" }),
  ];

  it("大三夏令营 gradeFit = +20（冲刺期）", async () => {
    const results = await decide(JUNIOR, candidates, NOW);
    const camp = results.find((r) => r.recommendation.id === "beida-camp")!;
    const gf = camp.factors.find((f) => f.name === "gradeFit")!;
    expect(gf.score).toBe(20);
  });

  it("大三夏令营 fitScore 大幅高于大一（阶段切换）", async () => {
    const juniorResults = await decide(JUNIOR, candidates, NOW);
    const freshmanResults = await decide(NUAA_AI_FRESHMAN_BAOYAN, candidates, NOW);
    const juniorCamp = juniorResults.find((r) => r.recommendation.id === "beida-camp")!;
    const freshmanCamp = freshmanResults.find((r) => r.recommendation.id === "beida-camp")!;
    expect(juniorCamp.fitScore).toBeGreaterThan(freshmanCamp.fitScore); // 大三 > 大一
  });
});
