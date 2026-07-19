/**
 * 设计系统常量（产品化阶段，Agent B 第 12/13 条）
 *
 * 色彩/字号/可信度分档/状态色，单源复用。
 * 抽自原 competition-card.tsx 的 credibility 分档配色。
 *
 * 设计语言：Apple + Notion + Linear
 *   - neutral 灰阶为主（bg #FCFCFC/白，文字 900/600/400）
 *   - 主操作 = 单色黑（neutral-900，替代蓝色校园风）
 *   - 状态色 = 绿/蓝/琥珀/红/灰
 *   - Glass = 克制点缀（仅 Header/Hero）
 *   - 信息密度优先于过度留白
 */

// ---------- neutral 灰阶 ----------
export const NEUTRAL = {
  bg: "#FCFCFC", // 页面底（略灰，凸显白卡）
  surface: "#FFFFFF", // 卡片
  border: "#E5E5E5", // neutral-200
  borderHover: "#D4D4D4", // neutral-300
  textPrimary: "#171717", // neutral-900
  textSecondary: "#525252", // neutral-600
  textTertiary: "#A3A3A3", // neutral-400
} as const;

// ---------- 主操作色（单色黑） ----------
export const ACTION = {
  primary: "#171717", // neutral-900
  primaryHover: "#404040", // neutral-700
} as const;

// ---------- 状态色 ----------
export const STATUS = {
  success: "#16A34A", // green-600（可信 ≥0.9 / 成功）
  info: "#2563EB", // blue-600（可信 ≥0.7 / 信息）
  warning: "#D97706", // amber-600（可信 ≥0.5 / 学生经验 / 警示）
  danger: "#DC2626", // red-600（即将截止 / 错误）
  muted: "#737373", // neutral-500（已截止 / 低分）
} as const;

// ---------- 可信度分档（与分数同源，单源） ----------
/** credibility_score → 分档 {label, color, bg} */
export interface CredibilityTier {
  min: number; // 含下界
  color: string; // 文字色
  bg: string; // 背景色（淡）
  label: string;
}

export const CREDIBILITY_TIERS: CredibilityTier[] = [
  { min: 0.9, color: STATUS.success, bg: "#F0FDF4", label: "高可信" },
  { min: 0.7, color: STATUS.info, bg: "#EFF6FF", label: "较可信" },
  { min: 0.5, color: STATUS.warning, bg: "#FFFBEB", label: "中等可信" },
  { min: 0, color: STATUS.muted, bg: "#F5F5F5", label: "较低可信" },
];

/** 取分数对应的分档 */
export function getCredibilityTier(score: string | null): CredibilityTier | null {
  if (!score) return null;
  const v = Number(score);
  if (Number.isNaN(v)) return null;
  return CREDIBILITY_TIERS.find((t) => v >= t.min) ?? CREDIBILITY_TIERS[CREDIBILITY_TIERS.length - 1]!;
}

// ---------- 截止状态 ----------
export interface DeadlineState {
  color: string;
  label: string; // 含剩余天数
  tone: "danger" | "warning" | "muted";
}

/**
 * 截止状态计算（与详情页同源）
 * - 已过期 → muted 灰
 * - ≤14 天 → danger 红"即将截止·剩 N 天"
 * - >14 天 → muted 灰"报名截止 日期"
 */
export function getDeadlineState(date: Date | null, now: Date = new Date()): DeadlineState | null {
  if (!date) return null;
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const text = date.toLocaleDateString("zh-CN");
  if (diffDays < 0) {
    return { color: STATUS.muted, label: `报名已截止（${text}）`, tone: "muted" };
  }
  if (diffDays <= 14) {
    return { color: STATUS.danger, label: `即将截止 · 剩 ${diffDays} 天（${text}）`, tone: "danger" };
  }
  return { color: NEUTRAL.textSecondary, label: `报名截止 ${text}`, tone: "muted" };
}

// ---------- 难度星级 ----------
export const RATING_MAX = 5;

// ---------- 字号 ----------
export const FONT_SIZE = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
} as const;
