import type { ReactNode } from "react";

/**
 * EmptyState — 空态提示
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center">
      <p className="text-sm text-neutral-500">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-neutral-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
