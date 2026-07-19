import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

/**
 * Onboarding 页（P4-1，登录守卫）
 * 注册/登录后引导填资料，可跳过
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/dashboard";
  const user = await getCurrentUser();
  if (!user) {
    // 未登录跳登录，完成后回 onboarding
    return (
      <main className="mx-auto max-w-md px-6 py-10 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">需要登录</h1>
        <a
          href={`/login?next=/onboarding?next=${encodeURIComponent(next)}`}
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          去登录
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          完善你的资料
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          帮我们推荐适合你的机会，随时可在设置中修改
        </p>
      </header>
      <OnboardingForm next={next} />
    </main>
  );
}
