"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 登录/注册表单（简化版）
 */
export function ClientAuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; needsOnboarding?: boolean };
      if (!res.ok) {
        setError(data.error ?? "操作失败");
        return;
      }
      router.refresh();
      if (mode === "register") {
        router.push("/onboarding");
      } else if (data.needsOnboarding) {
        router.push("/onboarding");
      } else {
        router.push(next);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-2 border-b border-neutral-100 pb-3">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "login" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "register" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          注册
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          密码{mode === "register" && "（至少 8 位）"}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
      >
        {loading ? "处理中…" : mode === "login" ? "登录" : "注册"}
      </button>

      {mode === "register" && (
        <p className="text-center text-xs text-neutral-400">
          注册后选择你的专业方向，即可查看相关资源
        </p>
      )}
    </form>
  );
}
