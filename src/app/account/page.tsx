import { blogSsoEnabled, blogOrigin } from "@/lib/blog-sso";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Account() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <section className="panel" style={{ maxWidth: 600, margin: "auto" }}>
      <h1>我的账号</h1>
      <p className="muted">{u.email}</p>
      {blogSsoEnabled() && (
        <p>
          <a className="btn" href={`${blogOrigin()}/account`}>
            管理博客账号
          </a>
        </p>
      )}
      <form action="/api/auth/logout" method="post">
        <button className="btn">退出登录</button>
      </form>
    </section>
  );
}
