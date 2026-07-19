"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * 收藏卡片（Dashboard 用，带取消收藏）
 * 复用 DELETE /api/favorites/:infoItemId
 */
export function FavoriteItemCard({
  infoItemId,
  title,
  summary,
  credibilityScore,
}: {
  infoItemId: string;
  title: string;
  summary: string | null;
  credibilityScore: string | null;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    try {
      await fetch(`/api/favorites/${infoItemId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-neutral-100 p-3 transition-colors hover:border-neutral-200">
      <a
        href={`/competitions/${infoItemId}`}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium text-neutral-900 hover:underline">
          {title}
        </p>
        {summary && (
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
            {summary}
          </p>
        )}
        {credibilityScore && (
          <p className="mt-1 text-xs text-neutral-400">
            信息可信度评分 {credibilityScore}
          </p>
        )}
      </a>
      <Button
        variant="ghost"
        onClick={remove}
        disabled={removing}
        className="shrink-0 px-2 py-1 text-xs"
      >
        {removing ? "…" : "取消收藏"}
      </Button>
    </div>
  );
}
