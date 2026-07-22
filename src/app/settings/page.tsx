import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">需要登录</h1>
        <a
          href="/login?next=/settings"
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          去登录
        </a>
      </main>
    );
  }

  const profile = await getProfile(user.userId);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          个人设置
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          修改你的专业信息
        </p>
      </header>
      <SettingsForm
        initial={{
          major: profile?.major ?? null,
          majorDirection: profile?.majorDirection ?? null,
          grade: profile?.grade ?? null,
        }}
      />
    </main>
  );
}
