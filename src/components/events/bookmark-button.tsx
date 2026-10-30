"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function BookmarkButton({
  id,
  slug,
  initial,
}: {
  id: string;
  slug: string;
  initial: boolean;
}) {
  const [saved, setSaved] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/bookmarks/${id}`, {
        method: saved ? "DELETE" : "POST",
      });
      if (r.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
        return;
      }
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "操作失败");
      setSaved(!saved);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="btn" disabled={busy} onClick={toggle}>
        {saved ? "★ 已收藏" : "☆ 收藏活动"}
      </button>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
