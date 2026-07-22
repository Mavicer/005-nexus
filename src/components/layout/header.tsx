import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

/**
 * Header — 顶栏（Glass 克制点缀）
 * 未登录=登录链接；已登录=头像（email 首字母）+ 下拉（我的收藏/登出）
 * 下拉用原生 details/summary，无 JS 依赖（护栏：不引 Headless UI）
 */
export async function Header() {
  const user = await getCurrentUser();
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-neutral-200/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-neutral-900">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/explore"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            探索
          </Link>
          <Link
            href="/calendar"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            资源日历
          </Link>
          {user ? (
            <details className="group relative">
              <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                {initial}
              </summary>
              <div className="invisible absolute right-0 top-9 z-40 min-w-[10rem] rounded-lg border border-neutral-200 bg-white p-1 opacity-0 shadow-lg transition-all group-open:visible group-open:opacity-100">
                <div className="border-b border-neutral-100 px-3 py-2">
                  <p className="truncate text-xs text-neutral-500">{user.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="block rounded px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  专业资源库
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="block w-full rounded px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    登出
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
