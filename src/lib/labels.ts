/**
 * 共享标签常量（避免组件 re-export 当工具，nit-1 修复）
 * 详情页与卡片共用
 */

/** 竞赛级别中文标签 */
export const LEVEL_LABEL: Record<string, string> = {
  school: "校级",
  provincial: "省级",
  national: "国家级",
  international: "国际",
};

/** 认可度中文标签 */
export const RECOGNITION_LABEL: Record<string, string> = {
  official_A: "A 类（官方认定）",
  leaderboard_listed: "榜单收录",
  normal: "普通",
};

/** 举办频率中文标签 */
export const FREQUENCY_LABEL: Record<string, string> = {
  annual: "每年一届",
  biennial: "两年一届",
  irregular: "不定期",
  once: "一次性",
};

/** 参赛形式中文标签 */
export const TEAM_LABEL: Record<string, string> = {
  team: "组队",
  solo: "个人",
  both: "组队/个人均可",
};

/** 来源类型中文标签 */
export const SOURCE_TYPE_LABEL: Record<string, string> = {
  official_doc: "官方文件",
  inst_notice: "机构通知",
  authority_list: "权威榜单",
  official_site: "官方网站",
  student_exp: "学生经验",
  community: "社区内容",
};

/** 官方/权威来源类型集合（与 student_exp/community 分层，R6 合规） */
export const OFFICIAL_SOURCE_TYPES = new Set([
  "official_doc",
  "inst_notice",
  "authority_list",
  "official_site",
]);
