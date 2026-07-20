/**
 * 可信度计算（服务层实现，写入 info_items.credibility_score）
 *
 * 公式（Agent B 第 3 条消息第六节）：
 *   authority   = max(sources.authority_weight)                          // 最高权重来源为主权重
 *   freshness   = 1.0(≤6月) / 0.7(6-12月) / 0.4(>12月) / 0.1(超期未续)
 *   consistency = 0.6 + 0.4 * min(independent_high_weight_source_count - 1, 2) / 2
 *   credibility_score = round(authority*0.5 + freshness*0.3 + consistency*0.2, 2)
 *
 * 护栏3（Agent B 第 5 条）：可信度是「评分体系」非「真实性判断」。
 * EXTENSION POINT: user feedback factor (P2) — 公式结构预留可加项，
 *                  MVP 不接入，将来加用户反馈信号时不改公式骨架。
 */
import type { SourceType } from "./source-weights";

import {
  SOURCE_AUTHORITY_WEIGHT,
  HIGH_WEIGHT_THRESHOLD,
  type Weights,
} from "./source-weights";

/** 可信度计算权重（护栏3：预留 feedback 扩展位） */
export const CREDIBILITY_WEIGHTS: Weights = {
  authority: 0.5,
  freshness: 0.3,
  consistency: 0.2,
  // EXTENSION POINT: feedback (P2) — 解锁时在此加 feedback 权重并参与归一化
};

export interface SourceInfo {
  sourceType: SourceType;
  authorityWeight: number;
}

export interface CredibilityInput {
  sources: SourceInfo[];
  lastVerifiedAt: Date | null;
  expireAt: Date | null;
  now?: Date;
}

/**
 * 计算可信度评分（0.00–1.00）
 * 纯函数，无副作用，便于测试
 */
export function computeCredibilityScore(input: CredibilityInput): number {
  const { sources, lastVerifiedAt, expireAt } = input;
  const now = input.now ?? new Date();

  const authority = computeAuthority(sources);
  const freshness = computeFreshness(lastVerifiedAt, expireAt, now);
  const consistency = computeConsistency(sources);

  const score =
    authority * CREDIBILITY_WEIGHTS.authority +
    freshness * CREDIBILITY_WEIGHTS.freshness +
    consistency * CREDIBILITY_WEIGHTS.consistency;

  return Math.round(score * 100) / 100;
}

/** 可信度分项结果（Phase A 4.4：explainCredibility 透明展示，铁律②） */
export interface CredibilityBreakdown {
  /** 综合分（0-1） */
  score: number;
  /** 来源权威性（最高权重来源，0-1） */
  authority: number;
  /** 时效（≤6月1.0/6-12月0.7/>12月0.4/超期0.1） */
  freshness: number;
  /** 多源一致性（0.6-1.0） */
  consistency: number;
  /** 权重（来源0.5/时效0.3/一致性0.2，护栏3预留 feedback 扩展位） */
  weights: Weights;
}

/**
 * 可信度分项（Phase A 4.4）：返回 authority/freshness/consistency 各自分 + 综合分 + 权重。
 * 供详情页 CredibilityPanel 透明展示「信息可信度评分依据」（护栏3：评分体系非真值，可解释）。
 */
export function explainCredibility(input: CredibilityInput): CredibilityBreakdown {
  const { sources, lastVerifiedAt, expireAt } = input;
  const now = input.now ?? new Date();
  const authority = computeAuthority(sources);
  const freshness = computeFreshness(lastVerifiedAt, expireAt, now);
  const consistency = computeConsistency(sources);
  const score = computeCredibilityScore(input);
  return { score, authority, freshness, consistency, weights: CREDIBILITY_WEIGHTS };
}

/** authority = 最高权重来源的权重 */
function computeAuthority(sources: SourceInfo[]): number {
  if (sources.length === 0) return 0;
  return Math.max(...sources.map((s) => s.authorityWeight));
}

/**
 * freshness = 1.0(≤6月) / 0.7(6-12月) / 0.4(>12月) / 0.1(超期未续)
 * last_verified_at 为 null 视为未验证 → 0.1
 */
function computeFreshness(
  lastVerifiedAt: Date | null,
  expireAt: Date | null,
  now: Date,
): number {
  // 超期且未续
  if (expireAt && expireAt.getTime() < now.getTime()) {
    return 0.1;
  }
  if (!lastVerifiedAt) return 0.1;

  const monthsSinceVerified = monthDiff(lastVerifiedAt, now);
  if (monthsSinceVerified <= 6) return 1.0;
  if (monthsSinceVerified <= 12) return 0.7;
  return 0.4;
}

/**
 * consistency = 0.6 + 0.4 * min(independent_high_weight_source_count - 1, 2) / 2
 * 「独立高权重」= authority_weight ≥ HIGH_WEIGHT_THRESHOLD 且来源不同
 * 1个=0.6, 2个=0.8, 3+个=1.0
 */
function computeConsistency(sources: SourceInfo[]): number {
  const highWeightCount = sources.filter(
    (s) => s.authorityWeight >= HIGH_WEIGHT_THRESHOLD,
  ).length;
  const capped = Math.min(highWeightCount - 1, 2);
  const cappedSafe = Math.max(capped, 0);
  return 0.6 + (0.4 * cappedSafe) / 2;
}

function monthDiff(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30);
}

// 来源权重映射导出（供写入 info_sources 时派生 authority_weight 使用）
export { SOURCE_AUTHORITY_WEIGHT };
