import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/dashboard";
  const user = await getCurrentUser();
  if (!user) {
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
          选择你的专业方向
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          选择后即可查看该领域的竞赛、科研、实习等资源
        </p>
      </header>
      <OnboardingForm next={next} />
    </main>
  );
}
