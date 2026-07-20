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
    majorText: "人工智能",
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

// ---------- 因子 2：majorMatch（Phase A 4.2 向量点积，任意专业可归一） ----------
describe("majorMatch（向量点积版）", () => {
  it("人工智能 × 科研(research) → 高分（research 轴匹配）", () => {
    const f = majorMatch(profile(), opp({ category: "research" }));
    expect(f.score).toBeGreaterThan(15); // 向量点积高
  });

  it("人工智能 × ACM 竞赛 → 高分（math/engineering 轴匹配）", () => {
    const f = majorMatch(
      profile({ majorText: "人工智能" }),
      opp({ category: "competition", title: "ACM-ICPC 国际大学生程序设计竞赛" }),
    );
    expect(f.score).toBeGreaterThanOrEqual(20); // 接近枚举版 S=25
  });

  it("康复治疗学 × 临床实习 → 高分（clinical 轴主导匹配）", () => {
    const f = majorMatch(
      profile({ majorText: "康复治疗学" }),
      opp({ category: "internship", title: "临床实习/规培" }),
    );
    expect(f.score).toBeGreaterThanOrEqual(20); // clinical 0.9×1.0 主导
    expect(f.reason).toContain("临床实践");
  });

  it("康复治疗学 × ACM → 低分（临床轴错配，不特调）", () => {
    const f = majorMatch(
      profile({ majorText: "康复治疗学" }),
      opp({ category: "competition", title: "ACM-ICPC 国际大学生程序设计竞赛" }),
    );
    expect(f.score).toBeLessThan(20); // 远低于康复×临床
    // 证明不靠"康复"在枚举表，靠 clinical 轴点积自然分流
  });

  it("归一失败（生僻专业）→ 落中性向量，不报错不 0 分", () => {
    const f = majorMatch(
      profile({ majorText: "xxx不存在的专业yyy" }),
      opp({ category: "competition", title: "ACM-ICPC" }),
    );
    expect(f.score).toBeGreaterThan(0); // 中性向量与任何机会点积都中等分
    expect(f.score).toBeLessThan(20);
  });

  it("电气工程 × 电子设计竞赛 → 高分（engineering 轴匹配，nit-12）", () => {
    const f = majorMatch(
      profile({ majorText: "电气工程及其自动化" }),
      opp({ category: "competition", title: "全国大学生电子设计竞赛" }),
    );
    expect(f.score).toBeGreaterThanOrEqual(20); // engineering 轴高匹配（electronic-design 向量 engineering=1.0）
  });

  it("majorMatch reason 取 dominantAxis 可解释（铁律②）", () => {
    const f = majorMatch(
      profile({ majorText: "康复治疗学" }),
      opp({ category: "internship", title: "临床实习/规培" }),
    );
    expect(f.source).toContain("dot"); // source 追到向量点积
    expect(f.reason).toMatch(/轴|价值|匹配/); // 含主导轴说明
  });

  it("majorMatch tier 映射常量保留（向后兼容）", () => {
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
    const mm = majorMatch(p, o); // 向量点积 AI×夏令营≈24（dominantAxis engineering）
    const gf = gradeFit(p, o); // freshman+了解 -15（方案A）
    const sf = schoolFit(p, o); // 211+北大夏令营 -8
    const r = roi(p, o); // 低投入优秀营员 +12
    const tc = timeConflict(o, NOW); // 0
    const fitScore = gm.score + mm.score + gf.score + sf.score + r.score - tc.score;
    // 向量版 majorMatch=24（非枚举 25），fitScore=30+24-15-8+12-0=43，仍在末位区
    expect(fitScore).toBe(43);
    expect(mm.score).toBe(24); // 向量点积量级确认
  });

  it("大三 + 北大夏令营 → gradeFit +20，fitScore 升首位区", () => {
    const pJunior = profile({ grade: "junior" });
    const o = opp({
      id: "baoyan-1",
      title: "北京大学优秀大学生夏令营",
      category: "baoyan",
      level: "school",
    });
    const gf = gradeFit(pJunior, o);
    expect(gf.score).toBe(20); // junior+冲刺
    // 向量版 majorMatch=24（AI×夏令营，dominantAxis engineering）
    // fitScore = 30(goalMatch S) + 24(majorMatch) + 20(gradeFit 冲刺) - 8(schoolFit 错配) + 12(roi) - 0(timeConflict) = 78
    const fitScore =
      goalMatch("baoyan", o)!.score +
      majorMatch(pJunior, o).score +
      gf.score +
      schoolFit(pJunior, o).score +
      roi(pJunior, o).score -
      timeConflict(o, NOW).score;
    expect(fitScore).toBe(78); // 向量版 majorMatch 24 而非枚举 25
  });
});
