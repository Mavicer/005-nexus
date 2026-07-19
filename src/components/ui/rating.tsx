import { RATING_MAX } from "@/lib/design";

/**
 * Rating — 星级（难度 1-5）
 * 信息密度：小星 + 数字，非大留白
 */
export function Rating({
  value,
  max = RATING_MAX,
}: {
  value: number;
  max?: number;
}) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`难度 ${value}/${max}`}
    >
      {stars.map((n) => (
        <span
          key={n}
          className={n <= value ? "text-neutral-900" : "text-neutral-200"}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-xs text-neutral-400">
        {value}/{max}
      </span>
    </span>
  );
}
