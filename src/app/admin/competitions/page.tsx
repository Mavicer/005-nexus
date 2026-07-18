import Link from "next/link";

import { requireAdminPage } from "@/lib/auth";
import { listAdminCompetitions } from "@/lib/admin/competitions";
import { LEVEL_LABEL } from "@/lib/labels";
import { AdminActions } from "@/components/admin-actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  pending: "待审",
  published: "已发布",
  archived: "已下架",
  removed: "已删除",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  pending: "bg-amber-50 text-amber-700",
  published: "bg-green-50 text-green-700",
  archived: "bg-neutral-100 text-neutral-400",
  removed: "bg-red-50 text-red-600",
};

/**
 * 管理员竞赛列表（admin 守卫）
 */
export default async function AdminCompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireAdminPage();
  if (!user) {
    return <Forbidden />;
  }

  const sp = await searchParams;
  const status = sp.status ?? "all";
  const items = await listAdminCompetitions(status);

  const tabs = ["all", "draft", "published", "archived"];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">竞赛管理</h1>
          <p className="mt-1 text-sm text-neutral-500">
            录入 → 草稿 → 发布 → 搜索可见
          </p>
        </div>
        <Link
          href="/admin/competitions/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + 新建竞赛
        </Link>
      </header>

      <nav className="mb-6 flex gap-2 border-b border-neutral-100 pb-3">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/admin/competitions${t === "all" ? "" : `?status=${t}`}`}
            className={`rounded-md px-3 py-1 text-sm ${
              status === t
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            {t === "all" ? "全部" : STATUS_LABEL[t] ?? t}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          暂无竞赛
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs ${
                  STATUS_COLOR[it.status] ?? "bg-neutral-100 text-neutral-500"
                }`}
              >
                {STATUS_LABEL[it.status] ?? it.status}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/competitions/${it.id}/edit`}
                  className="block truncate text-sm font-medium text-neutral-900 hover:underline"
                >
                  {it.title}
                </Link>
                <p className="text-xs text-neutral-400">
                  {it.level ? LEVEL_LABEL[it.level] ?? it.level : "—"}
                  {it.signUpEnd && ` · 截止 ${it.signUpEnd.toLocaleDateString("zh-CN")}`}
                  {it.credibilityScore && ` · 可信度 ${it.credibilityScore}`}
                </p>
              </div>
              <AdminActions id={it.id} status={it.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Forbidden() {
  return (
    <main className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-xl font-semibold">需要管理员权限</h1>
      <p className="mt-2 text-sm text-neutral-500">
        当前账号无管理员权限，无法访问后台。
      </p>
      <Link
        href="/"
        className="mt-4 inline-block text-sm text-blue-600 underline"
      >
        返回首页
      </Link>
    </main>
  );
}
