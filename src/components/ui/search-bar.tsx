"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * SearchBar — Hero 搜索框（Glass 背景，仅 Hero 用）
 * 与现有 SearchBox 同逻辑，UI 升级为 glass-panel
 * 提交后跳 /explore?q=...
 */
export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="glass-panel flex items-center gap-2 rounded-2xl px-4 py-3 shadow-sm"
    >
      <span className="text-neutral-400">🔍</span>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索竞赛，如 数学建模、ICPC、挑战杯"
        className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        搜索
      </button>
    </form>
  );
}
