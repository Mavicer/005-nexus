import type { ReactNode } from "react";

/**
 * Card — 白底卡片容器（主体内容用，非 Glass）
 * 信息密度优先：padding 适中，非大留白
 */
export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={`rounded-lg border border-neutral-200 bg-white ${className}`}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
      <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}
