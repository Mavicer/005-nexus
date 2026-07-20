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
  programModeEnum,
  gpaTierEnum,
  researchLevelEnum,
  competitionCapabilityEnum,
  englishLevelEnum,
  internshipLevelEnum,
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
// Phase A 4.5：培养模式 + 能力画像枚举
export type ProgramMode =
  (typeof programModeEnum)["enumValues"][number];
export type GpaTier =
  (typeof gpaTierEnum)["enumValues"][number];
export type ResearchLevel =
  (typeof researchLevelEnum)["enumValues"][number];
// 注：能力画像的竞赛水平用 competition_capability 枚举（值 none/provincial/national），
// 与比赛级别 competition_level（school/provincial/national/international）区分，避免重名冲突。
export type CompetitionCapability =
  (typeof competitionCapabilityEnum)["enumValues"][number];
export type EnglishLevel =
  (typeof englishLevelEnum)["enumValues"][number];
export type InternshipLevel =
  (typeof internshipLevelEnum)["enumValues"][number];
