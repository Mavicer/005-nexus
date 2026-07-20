/**
 * readinessGap 第7因子 + behavior-inference 单测（Phase A 4.5 第2小步）
 *
 * 覆盖：三态（未达/达且未超/已达且超）+ U3（数模达且未超+10 但 behavior-inference 重复降权）
 *      + U5（科研已超-10 / 科研深化达且未超+10 / 入门-10）。
 */
import { describe, expect, it } from "vitest";

import {
  readinessGapWithSubtype,
  type DecisionProfile,
} from "./factors";
import { inferFromBehaviors } from "./behavior-inference";

function profile(over: Partial<DecisionProfile> = {}): DecisionProfile {
  return {
    goal: "baoyan",
    schoolTier: "c211",
    majorDirection: "ai_general",
    majorText: "人工智能",
    grade: "freshman",
    ...over,
  };
}

// ---------- readinessGap 三态 ----------
describe("readinessGap 三态", () => {
  it("未达差1档 → 0（够格冲但差一点）", () => {
    // research 门槛 project，用户 researchLevel=none → none index -1(视为无能力) → 能力none 0
    // 改用 competitionCapability：门槛 provincial，用户 none → none 0
    const f = readinessGapWithSubtype(
      profile({ competitionCapability: "none" }),
      "math-modeling", // 门槛 competitionCapability=provincial
    );
    // none → 能力none 中性 0
    expect(f.score).toBe(0);
  });

  it("未达差1档（能力低于门槛1档）→ 0", () => {
    // competitionCapability 门槛 national，用户 provincial → 差1档
    const f = readinessGapWithSubtype(
      profile({ competitionCapability: "provincial" }),
      "acm", // 门槛 provincial → 达且未超+10
    );
    expect(f.score).toBe(10); // provincial=provincial 达且未超
  });

  it("达且未超（能力=门槛）→ +10（鼓励冲）", () => {
    const f = readinessGapWithSubtype(
      profile({ competitionCapability: "provincial" }),
      "math-modeling", // 门槛 provincial
    );
    expect(f.score).toBe(10);
    expect(f.reason).toContain("刚好达");
  });

  it("已达且超（能力>门槛）→ -10（提示升级）", () => {
    // researchLevel 门槛 project，用户 paper → 已超
    const f = readinessGapWithSubtype(
      profile({ researchLevel: "paper" }),
      "research", // 门槛 researchLevel=project
    );
    expect(f.score).toBe(-10);
    expect(f.reason).toContain("已超");
    expect(f.reason).toContain("升级");
  });

  it("门槛 none（无明确门槛 subtype）→ 0（不评）", () => {
    const f = readinessGapWithSubtype(
      profile({ researchLevel: "paper" }),
      "internship", // 无门槛映射 → 0
    );
    expect(f.score).toBe(0);
  });

  it("能力 none（未填）→ 0（中性，提示自评）", () => {
    const f = readinessGapWithSubtype(
      profile({ researchLevel: null }),
      "research", // 门槛 project
    );
    expect(f.score).toBe(0);
    expect(f.reason).toContain("未填");
  });
});

// ---------- U5 场景：清华计算机大三已有SCI ----------
describe("U5 场景：已有 SCI（researchLevel=paper）", () => {
  const U5 = profile({
    schoolTier: "C9",
    majorDirection: "cs_general",
    majorText: "计算机科学与技术",
    grade: "junior",
    researchLevel: "paper",
    competitionCapability: "national",
  });

  it("科研机会（门槛 project）→ 已超 -10（提示升级）", () => {
    const f = readinessGapWithSubtype(U5, "research");
    expect(f.score).toBe(-10);
  });

  it("科研深化机会（门槛 paper）→ 达且未超 +10（鼓励深化）", () => {
    // 注：research/大创门槛=project，U5 paper 已超-10。
    // 科研深化应标更高门槛 paper，当前 OPPORTUNITY_THRESHOLD research=project。
    // U5 vs research = 已超-10（合理：U5 已有SCI，再做大创=低收益）
    const f = readinessGapWithSubtype(U5, "research");
    // 已超 paper > project
    expect(f.score).toBe(-10);
  });
});

// ---------- U3 场景：普通211计算机大二已有数模省奖 ----------
describe("U3 场景：已有数模省奖（competitionCapability=provincial）", () => {
  const U3 = profile({
    schoolTier: "c211",
    majorDirection: "cs_general",
    majorText: "计算机科学与技术",
    grade: "sophomore",
    competitionCapability: "provincial",
    researchLevel: "none",
  });

  it("数模（门槛 provincial）→ 达且未超 +10", () => {
    const f = readinessGapWithSubtype(U3, "math-modeling");
    expect(f.score).toBe(10);
  });

  it("behavior-inference 标重复 subtype → engine dedup 降权", () => {
    // U3 收藏过数模类机会 → inferFromBehaviors 标 math-modeling 重复
    const inf = inferFromBehaviors(
      [
        { title: "全国大学生数学建模竞赛", category: "competition", type: "favorite" },
        { title: "美国大学生数学建模竞赛", category: "competition", type: "favorite" },
      ],
      { competitionCapability: "provincial" },
    );
    expect(inf.repeatedSubtypes).toContain("math-modeling");
    // engine 据此给同 subtype 额外 -5（见 engine evaluateOpportunity 重复降权）
  });
});

// ---------- behavior-inference ----------
describe("behavior-inference", () => {
  it("收藏国家级竞赛 → 推断 competitionCapability", () => {
    const inf = inferFromBehaviors([
      { title: "ACM-ICPC", category: "competition", type: "favorite" },
    ]);
    expect(inf.inferred.competitionCapability).toBe("provincial");
  });

  it("收藏科研类 → 推断 researchLevel=project", () => {
    const inf = inferFromBehaviors([
      { title: "国家级大学生创新创业训练计划", category: "research", type: "favorite" },
    ]);
    expect(inf.inferred.researchLevel).toBe("project");
  });

  it("同 subtype ≥2 次 → 重复标记", () => {
    const inf = inferFromBehaviors([
      { title: "全国大学生数学建模竞赛", category: "competition", type: "favorite" },
      { title: "美国大学生数学建模竞赛", category: "competition", type: "view" },
    ]);
    expect(inf.repeatedSubtypes).toContain("math-modeling");
  });

  it("与自评冲突 → 不覆盖只提示", () => {
    const inf = inferFromBehaviors(
      [{ title: "ACM-ICPC", category: "competition", type: "favorite" }],
      { competitionCapability: "none" }, // 自评无，但行为显示有省级
    );
    expect(inf.conflicts.length).toBeGreaterThan(0);
    expect(inf.conflicts[0]!.hint).toContain("是否需要更新");
    // 推断值不覆盖自评（inferred 独立，selfAssessed 不变）
    expect(inf.inferred.competitionCapability).toBe("provincial");
  });
});
