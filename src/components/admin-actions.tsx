"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 管理员操作按钮：发布/下架（调用 admin API）
 */
export function AdminActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "publish" | "archive") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/competitions/${id}?action=${action}`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      {status === "draft" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => act("publish")}
          className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
        >
          发布
        </button>
      )}
      {status === "published" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => act("archive")}
          className="rounded-md border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          下架
        </button>
      )}
    </div>
  );
}
