import type { ReactNode } from "react";

/**
 * Timeline — 轮次/报名流程时间线（竖向圆点 + 连线）
 * 信息密度：紧凑，每项一行圆点 + 名称 + 日期
 */
export interface TimelineItem {
  id?: string;
  name: string;
  startAt?: Date | null;
  endAt?: Date | null;
  meta?: ReactNode; // 额外标注（如"报名截止"/"出结果"高亮）
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return null;
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it.id ?? i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-neutral-400" />
            {i < items.length - 1 && (
              <span className="mt-1 w-px flex-1 bg-neutral-200" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm font-medium text-neutral-800">{it.name}</p>
            <p className="text-xs text-neutral-400">
              {[fmt(it.startAt), fmt(it.endAt)].filter(Boolean).join(" — ") ||
                "时间待定"}
            </p>
            {it.meta && <div className="mt-0.5">{it.meta}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function fmt(d?: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("zh-CN");
}
