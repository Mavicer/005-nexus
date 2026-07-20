/**
 * 决策引擎 6 因子 — 单元测试（铁律②可解释 + 铁律⑦验证驱动）
 *
 * 覆盖：goalMatch 4 档、majorMatch AI vs 非 AI、gradeFit 方案 A 关键格、timeConflict 已截止-100。
 * 运行：npx vitest run
 */
import { describe, expect, it } from "vitest";

import {
  goalMatch,
  majorMatch,
  gradeFit,
  schoolFit,
  roi,
  timeConflict,
  TIER_SCORE,
  MAJOR_TIER_SCORE,
  TIME_CONFLICT_CLOSED,
  type DecisionProfile,
  type DecisionOpportunity,
} from "./factors";

const NOW = new Date("2026-07-20T00:00:00Z");

function profile(over: Partial<DecisionProfile> = {}): DecisionProfile {
  return {
    goal: "baoyan",
    schoolTier: "c211",
    majorDirection: "ai_general",
    grade: "freshman",
    ...over,
  };
}

function opp(over: Partial<DecisionOpportunity> = {}): DecisionOpportunity {
  return {
    id: "test",
    title: "测试机会",
    category: "competition",
    level: "national",
    recognition: "official_A",
    signUpEnd: null,
    ...over,
  };
}

// ---------- 因子 1：goalMatch（4 档：S/A/B/不适用） ----------
describe("goalMatch", () => {
  it("保研+竞赛 → S 档 +30", () => {
    const f = goalMatch("baoyan", opp({ category: "competition" }));
    expect(f).not.toBeNull();
    expect(f!.score).toBe(30); // TIER_SCORE.S
  });

  it("保研+奖学金 → A 档 +15", () => {
    const f = goalMatch("baoyan", opp({ category: "scholarship" }));
    expect(f).not.toBeNull();
    expect(f!.score).toBe(15); // TIER_SCORE.A
  });

  it("保研+实习 → B 档 +5", () => {
    const f = goalMatch("baoyan", opp({ category: "internship" }));
    expect(f).not.toBeNull();
    expect(f!.score).toBe(5); // TIER_SCORE.B
  });

  it("保研+不适用 category（exam）→ null 不进候选", () => {
    const f = goalMatch("baoyan", opp({ category: "exam" }));
    expect(f).toBeNull();
  });

  it("tier→分值映射集中可审", () => {
    expect(TIER_SCORE).toEqual({ S: 30, A: 15, B: 5 });
  });
});

// ---------- 因子 2：majorMatch（AI vs 非 AI 分流） ----------
describe("majorMatch", () => {
  it("AI 保研 + 科研 → knowledge S → +25", () => {
    const f = majorMatch(
      profile({ majorDirection: "ai_general" }),
      opp({ category: "research" }),
    );
    expect(f.score).toBe(25); // MAJOR_TIER_SCORE.S
    expect(f.source).toContain("ai_general");
  });

  it("AI 保研 + 竞赛(ACM subtype) → knowledge S → +25", () => {
    const f = majorMatch(
      profile({ majorDirection: "ai_general" }),
      opp({ category: "competition" }),
    );
    // 竞赛按 category 兜底为 math-modeling → A(+10)
    expect(f.score).toBe(10); // MAJOR_TIER_SCORE.A
  });

  it("经管保研 + 竞赛 → knowledge null → 0（非 AI 回退 base）", () => {
    const f = majorMatch(
      profile({ majorDirection: "business_general" }),
      opp({ category: "competition" }),
    );
    expect(f.score).toBe(0);
    expect(f.source).toContain("null");
  });

  it("majorMatch tier 映射集中可审", () => {
    expect(MAJOR_TIER_SCORE).toEqual({ S: 25, A: 10, B: 2 });
  });
});

// ---------- 因子 3：gradeFit（方案 A 关键格） ----------
describe("gradeFit（方案 A：大一了解=-15）", () => {
  it("大一 + 保研夏令营（stageRole=了解）→ -15（owner 痛点②压末位）", () => {
    const f = gradeFit(
      profile({ grade: "freshman" }),
      opp({ category: "baoyan" }),
    );
    expect(f.score).toBe(-15);
  });

  it("大三 + 保研夏令营（stageRole=冲刺）→ +20（大三升首位）", () => {
    const f = gradeFit(
      profile({ grade: "junior" }),
      opp({ category: "baoyan" }),
    );
    expect(f.score).toBe(20);
  });

  it("大一 + 科研（stageRole=准备）→ +15（大一开始准备正当时）", () => {
    const f = gradeFit(
      profile({ grade: "freshman" }),
      opp({ category: "research" }),
    );
    expect(f.score).toBe(15);
  });

  it("大四 + 收尾类 → +12", () => {
    // senior + 收尾（夏令营大四 stageRole=收尾）
    const f = gradeFit(
      profile({ grade: "senior" }),
      opp({ category: "baoyan" }),
    );
    expect(f.score).toBe(12);
  });

  it("非 AI 方向（无 stageRole）→ 中性 0", () => {
    const f = gradeFit(
      profile({ majorDirection: "business_general" }),
      opp({ category: "competition" }),
    );
    expect(f.score).toBe(0);
  });

  it("无 grade → 中性 0", () => {
    const f = gradeFit(
      profile({ grade: null }),
      opp({ category: "research" }),
    );
    expect(f.score).toBe(0);
  });
});

// ---------- 因子 4：schoolFit（学校层次 × 门槛） ----------
describe("schoolFit", () => {
  it("C9 + international/official_A → +5", () => {
    const f = schoolFit(
      profile({ schoolTier: "C9" }),
      opp({ level: "international", recognition: "official_A" }),
    );
    expect(f.score).toBe(5);
  });

  it("211 + national/official_A → +3", () => {
    const f = schoolFit(
      profile({ schoolTier: "c211" }),
      opp({ level: "national", recognition: "official_A" }),
    );
    expect(f.score).toBe(3);
  });

  it("211 + international（ACM-ICPC）→ 0（门槛高不加分）", () => {
    const f = schoolFit(
      profile({ schoolTier: "c211" }),
      opp({ level: "international", recognition: "official_A" }),
    );
    expect(f.score).toBe(0);
  });

  it("211 + 北大夏令营（baoyan school级）→ -8（错配）", () => {
    const f = schoolFit(
      profile({ schoolTier: "c211" }),
      opp({ category: "baoyan", level: "school" }),
    );
    expect(f.score).toBe(-8);
  });

  it("无 schoolTier → 中性 0", () => {
    const f = schoolFit(
      profile({ schoolTier: null }),
      opp({ level: "national" }),
    );
    expect(f.score).toBe(0);
  });
});

// ---------- 因子 5：roi（投入产出） ----------
describe("roi", () => {
  it("AI 保研 + 科研（高投入顶会产出）→ +8", () => {
    const f = roi(profile(), opp({ category: "research" }));
    expect(f.score).toBe(8);
  });

  it("AI 保研 + 保研夏令营（低投入优秀营员）→ +12", () => {
    const f = roi(profile(), opp({ category: "baoyan" }));
    expect(f.score).toBe(12);
  });

  it("非 AI（无 knowledge）→ 中性 0", () => {
    const f = roi(
      profile({ majorDirection: "business_general" }),
      opp({ category: "competition" }),
    );
    expect(f.score).toBe(0);
  });
});

// ---------- 因子 6：timeConflict（已截止 -100 不静默） ----------
describe("timeConflict", () => {
  it("报名已过 → -100（标已截止，不静默丢弃）", () => {
    const past = new Date(NOW.getTime() - 10 * 86400000); // 10 天前
    const f = timeConflict(opp({ signUpEnd: past }), NOW);
    expect(f.score).toBe(TIME_CONFLICT_CLOSED);
    expect(f.reason).toContain("已截止");
  });

  it("距截止 ≤7 天 → -15（来不及准备）", () => {
    const soon = new Date(NOW.getTime() + 5 * 86400000); // 5 天后
    const f = timeConflict(opp({ signUpEnd: soon }), NOW);
    expect(f.score).toBe(-15);
  });

  it("距截止 7-60 天 → 0（正常窗口）", () => {
    const normal = new Date(NOW.getTime() + 30 * 86400000); // 30 天后
    const f = timeConflict(opp({ signUpEnd: normal }), NOW);
    expect(f.score).toBe(0);
  });

  it("无 signUpEnd → 0（不评）", () => {
    const f = timeConflict(opp({ signUpEnd: null }), NOW);
    expect(f.score).toBe(0);
  });

  it("已截止标记分常量 = -100", () => {
    expect(TIME_CONFLICT_CLOSED).toBe(-100);
  });
});

// ---------- 集成：南航 AI 大一保研 手工跑 6 因子（对照基准分表） ----------
describe("集成：南航 AI 大一保研（对照基准分表方案 A）", () => {
  const p = profile(); // c211/ai_general/freshman/baoyan

  it("科研-国创 fitScore 各因子符合基准分表", () => {
    const o = opp({
      id: "research-1",
      title: "国家级大学生创新创业训练计划",
      category: "research",
      level: "national",
      recognition: "normal",
    });
    const gm = goalMatch("baoyan", o)!; // S +30
    const mm = majorMatch(p, o); // knowledge S +25
    const gf = gradeFit(p, o); // freshman+准备 +15
    const sf = schoolFit(p, o); // 211+national +3
    const r = roi(p, o); // 高投入顶会 +8
    const tc = timeConflict(o, NOW); // 0
    expect(gm.score).toBe(30);
    expect(mm.score).toBe(25);
    expect(gf.score).toBe(15);
    expect(sf.score).toBe(3);
    expect(r.score).toBe(8);
    expect(tc.score).toBe(0);
    const fitScore = gm.score + mm.score + gf.score + sf.score + r.score - tc.score;
    expect(fitScore).toBe(81); // 对照基准分表
  });

  it("北大夏令营 大一 fitScore = 44（末位区，owner 痛点②）", () => {
    const o = opp({
      id: "baoyan-1",
      title: "北京大学优秀大学生夏令营",
      category: "baoyan",
      level: "school",
      recognition: "normal",
    });
    const gm = goalMatch("baoyan", o)!; // S +30
    const mm = majorMatch(p, o); // knowledge S +25
    const gf = gradeFit(p, o); // freshman+了解 -15（方案A）
    const sf = schoolFit(p, o); // 211+北大夏令营 -8
    const r = roi(p, o); // 低投入优秀营员 +12
    const tc = timeConflict(o, NOW); // 0
    const fitScore = gm.score + mm.score + gf.score + sf.score + r.score - tc.score;
    expect(fitScore).toBe(44); // 对照基准分表方案 A
  });

  it("大三 + 北大夏令营 → gradeFit +20，fitScore 升首位区(79)", () => {
    const pJunior = profile({ grade: "junior" });
    const o = opp({
      id: "baoyan-1",
      title: "北京大学优秀大学生夏令营",
      category: "baoyan",
      level: "school",
    });
    const gf = gradeFit(pJunior, o);
    expect(gf.score).toBe(20); // junior+冲刺
    // 注：大三时 tier 修正为 S（专业价值不随年级降），majorMatch +25
    // fitScore = 30(goalMatch S) + 25(majorMatch S) + 20(gradeFit 冲刺) - 8(schoolFit 错配) + 12(roi) - 0(timeConflict) = 79
    const fitScore =
      goalMatch("baoyan", o)!.score +
      majorMatch(pJunior, o).score +
      gf.score +
      schoolFit(pJunior, o).score +
      roi(pJunior, o).score -
      timeConflict(o, NOW).score;
    expect(fitScore).toBe(79);
  });
});
