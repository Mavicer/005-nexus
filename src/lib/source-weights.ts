/**
 * 来源权重映射（Agent B 第 3 条消息第 3 节）
 * source_type → authority_weight
 * 写死在服务层常量，写入 info_sources 时据此派生 authority_weight 列
 */
export type SourceType =
  | "official_doc"
  | "inst_notice"
  | "authority_list"
  | "student_exp"
  | "community"
  | "official_site";

export const SOURCE_AUTHORITY_WEIGHT: Record<SourceType, number> = {
  official_doc: 1.0,
  inst_notice: 0.8,
  authority_list: 0.7,
  official_site: 0.8,
  student_exp: 0.4,
  community: 0.2,
};

/** 「独立高权重」阈值（authority_weight ≥ 0.7 视为高权重，用于 consistency 计算） */
export const HIGH_WEIGHT_THRESHOLD = 0.7;

/** 可信度公式权重结构（护栏3：预留 feedback 扩展位） */
export interface Weights {
  authority: number;
  freshness: number;
  consistency: number;
  // EXTENSION POINT: feedback (P2)
}
