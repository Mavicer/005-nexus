/**
 * 可信度计算 — 单元测试
 * 验证 Agent B 第 3 条第六节公式
 *
 * 运行：npx vitest run（需先安装 vitest，见 package.json）
 */
import { describe, expect, it } from "vitest";

import { computeCredibilityScore } from "./credibility";

const NOW = new Date("2026-07-18T00:00:00Z");
const withinMonths = (m: number) => new Date(NOW.getTime() - m * 30 * 86400000);

describe("computeCredibilityScore", () => {
  it("无来源 → authority=0，分数低", () => {
    const score = computeCredibilityScore({
      sources: [],
      lastVerifiedAt: NOW,
      expireAt: null,
      now: NOW,
    });
    // authority=0, freshness=1.0, consistency=0.6 → 0*0.5 + 1*0.3 + 0.6*0.2 = 0.42
    expect(score).toBe(0.42);
  });

  it("单官方来源 + 6月内验证 → 高分", () => {
    const score = computeCredibilityScore({
      sources: [{ sourceType: "official_doc", authorityWeight: 1.0 }],
      lastVerifiedAt: withinMonths(3),
      expireAt: null,
      now: NOW,
    });
    // authority=1.0, freshness=1.0, consistency=0.6(1个) → 0.5+0.3+0.12=0.92
    expect(score).toBe(0.92);
  });

  it("两独立高权重来源 → consistency=0.8", () => {
    const score = computeCredibilityScore({
      sources: [
        { sourceType: "official_doc", authorityWeight: 1.0 },
        { sourceType: "inst_notice", authorityWeight: 0.8 },
      ],
      lastVerifiedAt: withinMonths(3),
      expireAt: null,
      now: NOW,
    });
    // authority=1.0, freshness=1.0, consistency=0.8(2个) → 0.5+0.3+0.16=0.96
    expect(score).toBe(0.96);
  });

  it("三独立高权重来源 → consistency=1.0", () => {
    const score = computeCredibilityScore({
      sources: [
        { sourceType: "official_doc", authorityWeight: 1.0 },
        { sourceType: "inst_notice", authorityWeight: 0.8 },
        { sourceType: "official_site", authorityWeight: 0.8 },
      ],
      lastVerifiedAt: withinMonths(3),
      expireAt: null,
      now: NOW,
    });
    // authority=1.0, freshness=1.0, consistency=1.0(3+个) → 0.5+0.3+0.2=1.0
    expect(score).toBe(1.0);
  });

  it("超期未续 → freshness=0.1", () => {
    const score = computeCredibilityScore({
      sources: [{ sourceType: "official_doc", authorityWeight: 1.0 }],
      lastVerifiedAt: withinMonths(3),
      expireAt: withinMonths(1), // 1 个月前已过期
      now: NOW,
    });
    // authority=1.0, freshness=0.1(超期), consistency=0.6 → 0.5+0.03+0.12=0.65
    expect(score).toBe(0.65);
  });

  it("验证超 12 月 → freshness=0.4", () => {
    const score = computeCredibilityScore({
      sources: [{ sourceType: "official_doc", authorityWeight: 1.0 }],
      lastVerifiedAt: withinMonths(18),
      expireAt: null,
      now: NOW,
    });
    // authority=1.0, freshness=0.4, consistency=0.6 → 0.5+0.12+0.12=0.74
    expect(score).toBe(0.74);
  });

  it("社区来源(0.2) + 学生经验(0.4) → 低 authority", () => {
    const score = computeCredibilityScore({
      sources: [
        { sourceType: "community", authorityWeight: 0.2 },
        { sourceType: "student_exp", authorityWeight: 0.4 },
      ],
      lastVerifiedAt: withinMonths(3),
      expireAt: null,
      now: NOW,
    });
    // authority=0.4(max), freshness=1.0, consistency=0.6(无高权重) → 0.2+0.3+0.12=0.62
    expect(score).toBe(0.62);
  });
});
