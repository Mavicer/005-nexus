import { blogSsoEnabled } from "@/lib/blog-sso";
import { AuthForm } from "@/components/events/auth-form";
import { safeNext } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  if (blogSsoEnabled())
    redirect(`/api/auth/blog/start?next=${encodeURIComponent(next)}`);
  return (
    <div style={{ maxWidth: 440, margin: "35px auto" }}>
      <h1>登录 / 注册</h1>
      <div className="panel">
        <AuthForm next={next} />
      </div>
    </div>
  );
}
