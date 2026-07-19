/**
 * Progress — 进度条（可信度可视化辅助）
 * 紧凑、信息密度优先
 */
export function Progress({
  value,
  max = 1,
  className = "",
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${className}`}
    >
      <div
        className="h-full rounded-full bg-neutral-900 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
