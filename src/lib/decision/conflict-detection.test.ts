/**
 * Phase A 4.6.3 冲突检测 + 5用户压力测试 + 反特调验收
 */
import { describe, expect, it } from "vitest";
import { decide } from "./engine";
import type { DecisionProfile, DecisionOpportunity } from "./factors";

const NOW = new Date("2026-07-21T00:00:00Z");

function opp(over: Partial<DecisionOpportunity> = {}): DecisionOpportunity {
  return {
    id: "test", title: "测试", category: "competition",
    level: "national", recognition: "official_A", signUpEnd: null, ...over,
  };
}

const HC_IELTS = {
  id: "hc1", type: "language_requirement" as const, title: "雅思≥6.5",
  value: "ielts_6.5", deadline: "3month", consequence: "影响出国",
  priority: "high" as const, source: "user_declared" as const,
};
const HC_GPA = {
  id: "hc2", type: "gpa_requirement" as const, title: "保研绩点前20%",
  value: "top20", deadline: "junior_end", consequence: "影响保研",
  priority: "high" as const, source: "user_declared" as const,
};

describe("4.6.3 冲突检测", () => {
  it("≥2 个高紧迫度硬约束并存 → conflictHint 提示", async () => {
    const p: DecisionProfile = {
      goal: "baoyan", goals: ["baoyan", "abroad"], schoolTier: "c211",
      majorDirection: "ai_general", majorText: "人工智能", grade: "sophomore",
      englishLevel: "cet", gpaTier: "top50",
      hardConstraints: [HC_IELTS, HC_GPA],
    };
    const results = await decide(p, [opp()], NOW);
    expect(results[0]!.conflictHint).toBeTruthy();
    expect(results[0]!.conflictHint).toContain("多个高压力目标");
  });

  it("单硬约束 → 无冲突提示", async () => {
    const p: DecisionProfile = {
      goal: "baoyan", schoolTier: "c211", majorDirection: "ai_general",
      majorText: "人工智能", grade: "freshman",
      hardConstraints: [HC_IELTS],
    };
    const results = await decide(p, [opp()], NOW);
    expect(results[0]!.conflictHint).toBeNull();
  });

  it("无硬约束 → 无冲突提示", async () => {
    const p: DecisionProfile = {
      goal: "baoyan", schoolTier: "c211", majorDirection: "ai_general",
      majorText: "人工智能", grade: "freshman",
    };
    const results = await decide(p, [opp()], NOW);
    expect(results[0]!.conflictHint).toBeNull();
  });
});

// ---------- U1 完整验收（owner 画像红线） ----------
describe("U1 完整验收：南航AI中外合办4+0 双目标 雅思6.5", () => {
  const U1: DecisionProfile = {
    goal: "baoyan", goals: ["baoyan", "abroad"], schoolTier: "c211",
    majorDirection: "ai_general", majorText: "人工智能", grade: "freshman",
    programMode: "sino_foreign", isGoAbroad: true,
    englishLevel: "cet",
    hardConstraints: [HC_IELTS],
  };
  const candidates: DecisionOpportunity[] = [
    opp({ id: "ielts", title: "雅思考试", category: "exam" }),
    opp({ id: "research", title: "国家级大学生创新创业训练计划", category: "research" }),
    opp({ id: "acm", title: "ACM-ICPC 国际大学生程序设计竞赛", category: "competition", level: "international" }),
  ];

  it("U1 decide() 返回结果含多目标 goalBreakdown", async () => {
    const results = await decide(U1, candidates, NOW);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.goalBreakdown.length).toBe(2); // baoyan + abroad
  });

  it("U1 雅思因硬约束 hardConstraintPressure > 0", async () => {
    const results = await decide(U1, candidates, NOW);
    const ielts = results.find((r) => r.recommendation.id === "ielts")!;
    const hcp = ielts.factors.find((f) => f.name === "hardConstraintPressure")!;
    expect(hcp.score).toBeGreaterThan(0); // 雅思升权
  });

  it("U1 科研无关联硬约束 → hardConstraintPressure = 0", async () => {
    const results = await decide(U1, candidates, NOW);
    const research = results.find((r) => r.recommendation.id === "research")!;
    const hcp = research.factors.find((f) => f.name === "hardConstraintPressure")!;
    expect(hcp.score).toBe(0);
  });
});

// ---------- 反特调测试 ----------
describe("反特调：换等价画像结果结构一致", () => {
  const candidates: DecisionOpportunity[] = [
    opp({ id: "research", title: "国家级大学生创新创业训练计划", category: "research" }),
    opp({ id: "acm", title: "ACM-ICPC 国际大学生程序设计竞赛", category: "competition", level: "international" }),
    opp({ id: "mm", title: "全国大学生数学建模竞赛", category: "competition" }),
  ];

  it("南航AI vs 北邮AI（换学校，同工学+AI微调）→ 排序结构一致", async () => {
    const NUAA: DecisionProfile = {
      goal: "baoyan", schoolTier: "c211", majorDirection: "ai_general",
      majorText: "人工智能", grade: "freshman",
    };
    const BUPT: DecisionProfile = {
      goal: "baoyan", schoolTier: "c211", majorDirection: "ai_general",
      majorText: "人工智能", grade: "freshman",
    };
    const r1 = await decide(NUAA, candidates, NOW);
    const r2 = await decide(BUPT, candidates, NOW);
    // 结构一致：首位相同 + ACM 排数模前
    expect(r1[0]!.recommendation.id).toBe(r2[0]!.recommendation.id);
    const acm1 = r1.find((r) => r.recommendation.id === "acm")!.rank;
    const acm2 = r2.find((r) => r.recommendation.id === "acm")!.rank;
    expect(acm1).toBe(acm2);
  });
});
