import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getCompetitionForEdit } from "@/lib/admin/get-for-edit";
import { CompetitionForm } from "@/components/competition-form";

export const dynamic = "force-dynamic";

/**
 * 编辑竞赛（admin 守卫）
 */
export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">需要管理员权限</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">
          返回首页
        </Link>
      </main>
    );
  }

  const { id } = await params;
  const initial = await getCompetitionForEdit(id);
  if (!initial) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/admin/competitions"
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          ← 返回列表
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">编辑竞赛</h1>
      <CompetitionForm initial={initial} editId={id} />
    </main>
  );
}
