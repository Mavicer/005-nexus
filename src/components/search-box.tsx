"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * 搜索框（表单提交同步 URL）
 */
export function SearchBox() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索竞赛名称，如 数学建模、ICPC、挑战杯"
        className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
      >
        搜索
      </button>
    </form>
  );
}
