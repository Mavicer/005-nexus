"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 收藏按钮（详情页用）
 * - 未登录点击 → 跳转登录页（/login?next=当前页）
 * - 已登录 → toggle 收藏状态
 */
export function FavoriteButton({
  infoItemId,
  initialFavorited,
}: {
  infoItemId: string;
  initialFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      if (favorited) {
        const res = await fetch(`/api/favorites/${infoItemId}`, {
          method: "DELETE",
        });
        if (res.status === 401) {
          router.push(`/login?next=/competitions/${infoItemId}`);
          return;
        }
        if (res.ok) setFavorited(false);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ infoItemId }),
        });
        if (res.status === 401) {
          router.push(`/login?next=/competitions/${infoItemId}`);
          return;
        }
        if (res.ok) setFavorited(true);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        favorited
          ? "border-neutral-300 bg-neutral-50 text-neutral-700"
          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      <span>{favorited ? "★" : "☆"}</span>
      {favorited ? "已收藏" : "收藏"}
    </button>
  );
}
