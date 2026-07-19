import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { ClientAuthForm } from "@/components/client-auth-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * 登录/注册页（新设计系统，Card 包裹 + Button 统一）
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
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900">
        {user ? "已登录" : "登录 / 注册"}
      </h1>

      {user ? (
        <Card className="p-5">
          <p className="text-sm text-neutral-600">
            当前账号：<span className="text-neutral-900">{user.email}</span>
          </p>
          <div className="mt-4 flex gap-3">
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="secondary">
                登出
              </Button>
            </form>
            <Link href={next}>
              <Button variant="ghost">返回 →</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <ClientAuthForm next={next} />
        </Card>
      )}
    </main>
  );
}
