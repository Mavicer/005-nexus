"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <div className="actions">
        <button
          className={`btn ${mode === "login" ? "primary" : ""}`}
          type="button"
          onClick={() => setMode("login")}
        >
          登录
        </button>
        <button
          className={`btn ${mode === "register" ? "primary" : ""}`}
          type="button"
          onClick={() => setMode("register")}
        >
          注册
        </button>
      </div>
      <label className="field">
        邮箱
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label className="field">
        密码（至少 8 位）
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={1024}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <button className="btn primary" disabled={busy}>
        {busy ? "处理中…" : mode === "login" ? "登录并继续" : "创建账号并继续"}
      </button>
      <p className="small muted">
        账号只用于同步收藏；无需填写学校、成绩或职业目标。
      </p>
    </form>
  );
}
