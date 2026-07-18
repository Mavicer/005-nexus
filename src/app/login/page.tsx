import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { ClientAuthForm } from "@/components/client-auth-form";

export const dynamic = "force-dynamic";

/**
 * 登录/注册页（极简，MVP）
 * 未实现复杂交互，仅提供表单提交到 API 的最小页面
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {user ? "已登录" : "登录 / 注册"}
      </h1>

      {user ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            当前账号：{user.email}
          </p>
          <form
            action="/api/auth/logout"
            method="post"
            className="inline-block"
          >
            <button
              type="submit"
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              登出
            </button>
          </form>
          <div>
            <Link href={next} className="text-sm text-blue-600 underline">
              返回 →
            </Link>
          </div>
        </div>
      ) : (
        <ClientAuthForm next={next} />
      )}
    </main>
  );
}
