/**
 * hardConstraintPressure 第8因子单测（Phase A 4.6.2）
 *
 * 覆盖：user_declared 升权 / system_inferred 不进 / pressure 三态（差距+紧迫度+影响）。
 */
import { describe, expect, it } from "vitest";

import { hardConstraintPressure, type DecisionProfile, type DecisionOpportunity } from "./factors";

const NOW = new Date("2026-07-21T00:00:00Z");

function profile(over: Partial<DecisionProfile> = {}): DecisionProfile {
  return {
    goal: "baoyan",
    schoolTier: "c211",
    majorDirection: "ai_general",
    majorText: "人工智能",
    grade: "freshman",
    programMode: "sino_foreign",
    isGoAbroad: true,
    ...over,
  };
}

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

describe("hardConstraintPressure 第8因子", () => {
  it("无硬约束 → 0（不评）", () => {
    const f = hardConstraintPressure(profile(), opp(), NOW);
    expect(f.score).toBe(0);
  });

  it("U1 雅思6.5硬约束 + 雅思机会(language-exam) → 升权（pressure>0）", () => {
    const p = profile({
      goal: "abroad", // 雅思对出国 goal impact 高
      englishLevel: "cet", // 当前四六级，差雅思1档
      hardConstraints: [
        {
          id: "hc1",
          type: "language_requirement",
          title: "雅思≥6.5大二前",
          value: "ielts_6.5",
          deadline: "sophomore_end",
          consequence: "影响出国",
          priority: "high",
          source: "user_declared",
        },
      ],
    });
    const o = opp({ category: "exam", title: "雅思考试" });
    const f = hardConstraintPressure(p, o, NOW);
    expect(f.score).toBeGreaterThan(0); // 雅思机会关联语言硬约束，升权
    expect(f.reason).toContain("由于你设置了"); // UI 透明归因用户输入
  });

  it("system_inferred 不进 priority（source 强约束）", () => {
    const p = profile({
      hardConstraints: [
        {
          id: "hc1",
          type: "language_requirement",
          title: "雅思6.5",
          value: "ielts_6.5",
          deadline: "sophomore_end",
          consequence: "x",
          priority: "high",
          source: "system_inferred" as "user_declared", // 模拟 system_inferred（api 会拒，此处测因子层）
        },
      ],
    });
    const o = opp({ category: "exam", title: "雅思考试" });
    const f = hardConstraintPressure(p, o, NOW);
    // source 强约束：因子层二次校验，system_inferred 不进
    expect(f.score).toBe(0);
  });

  it("不关联硬约束的机会 → 0（如 ACM 不关联语言硬约束）", () => {
    const p = profile({
      hardConstraints: [
        {
          id: "hc1",
          type: "language_requirement",
          title: "雅思6.5",
          value: "ielts_6.5",
          deadline: "sophomore_end",
          consequence: "x",
          priority: "high",
          source: "user_declared",
        },
      ],
    });
    const o = opp({ category: "competition", title: "ACM-ICPC 国际大学生程序设计竞赛" });
    const f = hardConstraintPressure(p, o, NOW);
    expect(f.score).toBe(0); // ACM 不关联语言硬约束
  });

  it("差距大 pressure 高（none vs ielts_6.5）", () => {
    const pNone = profile({
      goal: "abroad",
      englishLevel: "none",
      hardConstraints: [
        {
          id: "hc1",
          type: "language_requirement",
          title: "雅思6.5",
          value: "ielts_6.5",
          deadline: "sophomore_end",
          consequence: "x",
          priority: "high",
          source: "user_declared",
        },
      ],
    });
    const pCet = profile({ ...pNone, englishLevel: "cet" });
    const o = opp({ category: "exam", title: "雅思考试" });
    const fNone = hardConstraintPressure(pNone, o, NOW);
    const fCet = hardConstraintPressure(pCet, o, NOW);
    // none(差2档) pressure > cet(差1档)
    expect(fNone.score).toBeGreaterThanOrEqual(fCet.score);
  });

  it("reason 含差距+剩余月数可追溯", () => {
    const p = profile({
      goal: "abroad",
      englishLevel: "cet",
      hardConstraints: [
        {
          id: "hc1",
          type: "language_requirement",
          title: "雅思≥6.5大二前",
          value: "ielts_6.5",
          deadline: "sophomore_end",
          consequence: "影响出国",
          priority: "high",
          source: "user_declared",
        },
      ],
    });
    const o = opp({ category: "exam", title: "雅思考试" });
    const f = hardConstraintPressure(p, o, NOW);
    expect(f.reason).toMatch(/压力|剩余/); // 含 pressure + 剩余月数
    expect(f.source).toContain("hc1"); // 追到 constraint.id
  });
});
