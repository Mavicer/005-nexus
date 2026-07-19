import { getCredibilityTier, getDeadlineState } from "@/lib/design";
import { Tag } from "@/components/ui/tag";
import { CredibilityBadge } from "@/components/ui/badge";

/**
 * CredibilityBadge / LevelTag / DeadlineTag 通用标签
 * 配色单源 design.ts（getCredibilityTier / getDeadlineState）
 */

export { CredibilityBadge };

/** 级别标签 */
export function LevelTag({ level }: { level: string | null }) {
  if (!level) return null;
  return <Tag variant="neutral">{level}</Tag>;
}

/** 截止时间提示（配色 getDeadlineState） */
export function DeadlineTag({ date }: { date: Date | null }) {
  const state = getDeadlineState(date);
  if (!state) return null;
  return (
    <span className="text-xs" style={{ color: state.color }}>
      {state.label}
    </span>
  );
}

// 保持向后兼容（首页 SearchCard 仍 import 这些）
export { getCredibilityTier };
