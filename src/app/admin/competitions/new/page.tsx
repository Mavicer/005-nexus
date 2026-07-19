import Link from "next/link";

import { requireAdminPage } from "@/lib/auth";
import { CompetitionForm } from "@/components/competition-form";

export const dynamic = "force-dynamic";

/**
 * 新建竞赛（admin 守卫，查 DB）
 */
export default async function NewCompetitionPage() {
  const user = await requireAdminPage();
  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">需要管理员权限</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">
          返回首页
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/admin/competitions"
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          ← 返回列表
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900">
        新建竞赛
      </h1>
      <CompetitionForm />
    </main>
  );
}
