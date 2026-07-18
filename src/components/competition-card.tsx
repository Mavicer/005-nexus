import Link from "next/link";

/**
 * 可信度评分徽章（护栏3：措辞「信息可信度评分」，禁用"真实性/准确度"）
 */
export function CredibilityBadge({
  score,
}: {
  score: string | null;
}) {
  if (!score) return null;
  const value = Number(score);
  const label = "信息可信度评分";
  let color = "bg-neutral-100 text-neutral-600";
  if (value >= 0.9) color = "bg-green-50 text-green-700";
  else if (value >= 0.7) color = "bg-blue-50 text-blue-700";
  else if (value >= 0.5) color = "bg-amber-50 text-amber-700";
  else color = "bg-neutral-100 text-neutral-500";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
      title={`${label} ${score}（来源权重·时效·多源一致性综合）`}
    >
      {label} {score}
    </span>
  );
}

/**
 * 级别标签
 */
export function LevelTag({ level }: { level: string | null }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center rounded border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
      {level}
    </span>
  );
}

/**
 * 截止时间提示
 */
export function DeadlineTag({ date }: { date: Date | null }) {
  if (!date) return null;
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const text = date.toLocaleDateString("zh-CN");
  if (diffDays < 0) {
    return (
      <span className="text-xs text-neutral-400">报名已截止（{text}）</span>
    );
  }
  if (diffDays <= 14) {
    return (
      <span className="text-xs font-medium text-red-600">
        即将截止 · 剩 {diffDays} 天（{text}）
      </span>
    );
  }
  return <span className="text-xs text-neutral-500">报名截止 {text}</span>;
}

export { Link };
