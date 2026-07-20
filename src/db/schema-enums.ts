/**
 * 数据库枚举类型再导出（供业务层使用，避免直接依赖 pg-core 内部）
 * 从 schema 推导字面量联合类型
 */
import type {
  infoCategoryEnum,
  infoStatusEnum,
  sourceTypeEnum,
  goalGradeEnum,
  goalEnum,
  schoolTierEnum,
  majorDirectionEnum,
} from "./schema";

export type InfoCategory =
  (typeof infoCategoryEnum)["enumValues"][number];
export type InfoStatus =
  (typeof infoStatusEnum)["enumValues"][number];
export type SourceTypeValue =
  (typeof sourceTypeEnum)["enumValues"][number];
export type GoalGrade =
  (typeof goalGradeEnum)["enumValues"][number];
export type Goal =
  (typeof goalEnum)["enumValues"][number];
// Phase A：画像四维个性化枚举（owner 确认"加字段不加表"打磨例外）
export type SchoolTier =
  (typeof schoolTierEnum)["enumValues"][number];
export type MajorDirection =
  (typeof majorDirectionEnum)["enumValues"][number];
