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
  majorSubDirectionEnum,
  targetDirectionEnum,
  targetRoleEnum,
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

// Phase A+ A1：专业子方向 + 目标方向/岗位（owner 授权打磨例外）
export type MajorSubDirection =
  (typeof majorSubDirectionEnum)["enumValues"][number];
export type TargetDirection =
  (typeof targetDirectionEnum)["enumValues"][number];
export type TargetRole =
  (typeof targetRoleEnum)["enumValues"][number];

// Phase A 4.6：硬约束类型（source 强约束 user_declared，system_inferred 禁止进 priority）
export interface HardConstraint {
  id: string;
  type:
    | "language_requirement"
    | "gpa_requirement"
    | "internship_requirement"
    | "certificate"
    | "personal_plan";
  title: string; // "雅思≥6.5大二前"
  value: string; // "ielts_6.5"（经验区间，非固定分数线）
  deadline: string | null; // "sophomore_end"（大二结束前）
  consequence: string; // "影响出国/保研资格"
  priority: "high" | "mid" | "low";
  source: "user_declared"; // 强约束：只 user_declared，system_inferred 禁止
}
