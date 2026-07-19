import Link from "next/link";

import { requireAdminPage } from "@/lib/auth";
import { listAdminCompetitions } from "@/lib/admin/competitions";
import { LEVEL_LABEL } from "@/lib/labels";
import { AdminActions } from "@/components/admin-actions";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CredibilityBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  pending: "待审",
  published: "已发布",
  archived: "已下架",
  removed: "已删除",
};

// status → Tag variant（与设计系统分档配色一致）
function statusVariant(
  status: string,
): "neutral" | "amber" | "green" | "red" {
  if (status === "published") return "green";
  if (status === "pending") return "amber";
  if (status === "removed") return "red";
  return "neutral"; // draft / archived
}

/**
 * 管理员竞赛列表（admin 守卫，新设计系统）
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
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            竞赛管理
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            录入 → 草稿 → 发布 → 搜索可见
          </p>
        </div>
        <Link href="/admin/competitions/new">
          <Button>+ 新建竞赛</Button>
        </Link>
      </header>

      <nav className="mb-5 flex gap-2 border-b border-neutral-100 pb-3">
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
        <EmptyState title="暂无竞赛" description="点击右上角新建" />
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id} className="p-3">
              <div className="flex items-center gap-3">
                <Tag variant={statusVariant(it.status)}>
                  {STATUS_LABEL[it.status] ?? it.status}
                </Tag>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/competitions/${it.id}/edit`}
                    className="block truncate text-sm font-medium text-neutral-900 hover:underline"
                  >
                    {it.title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    {it.level && (
                      <span>{LEVEL_LABEL[it.level] ?? it.level}</span>
                    )}
                    {it.signUpEnd && (
                      <span>· 截止 {it.signUpEnd.toLocaleDateString("zh-CN")}</span>
                    )}
                  </p>
                </div>
                <CredibilityBadge score={it.credibilityScore} />
                <AdminActions id={it.id} status={it.status} />
              </div>
            </Card>
          ))}
        </div>
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
      <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">
        返回首页
      </Link>
    </main>
  );
}
