import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button — 主操作黑色按钮（neutral-900，替代蓝色校园风）
 * variant: primary(黑) / secondary(边框) / ghost(透明)
 */
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50",
    secondary:
      "border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50",
    ghost: "text-neutral-500 hover:text-neutral-900 disabled:opacity-50",
  };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
