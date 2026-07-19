import type { ReactNode } from "react";

/**
 * Tag — 通用标签（级别/学科/年级等）
 * border + xs，紧凑
 */
export function Tag({
  children,
  variant = "neutral",
  className = "",
}: {
  children: ReactNode;
  variant?: "neutral" | "green" | "blue" | "amber" | "red";
  className?: string;
}) {
  const styles: Record<string, string> = {
    neutral: "border-neutral-200 text-neutral-600",
    green: "border-green-200 bg-green-50 text-green-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
