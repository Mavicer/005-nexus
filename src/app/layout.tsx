import { BlogAppearanceSync } from "@/components/events/blog-appearance-sync";
import { SessionRefresh } from "@/components/events/session-refresh";
import { blogOrigin, blogSsoEnabled } from "@/lib/blog-sso";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Nexus · 计算机赛事", template: "%s · Nexus" },
  description:
    "计算机专业赛事目录，提供参赛条件、报名时间、提交要求与官方来源。",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="zh-CN">
      <body>
        <BlogAppearanceSync
          origin={process.env.BLOG_APPEARANCE_ORIGIN ?? blogOrigin()}
        />
        {blogSsoEnabled() && <SessionRefresh />}
        <header className="topbar">
          <div className="shell">
            <Link className="brand" href="/">
              <span className="brand-mark">N</span>Nexus
            </Link>
            <nav className="nav" aria-label="主导航">
              <Link href="/">发现赛事</Link>
              <a href={blogOrigin()}>博客</a>
              <Link href="/calendar">赛事日历</Link>
              <Link href="/saved">我的收藏</Link>
              <Link href="/about">收录说明</Link>
              {user?.isAdmin && <Link href="/admin/events">管理</Link>}
              <Link href={user ? "/account" : "/login"}>
                {user ? "账号" : "登录 ↗"}
              </Link>
            </nav>
          </div>
        </header>
        <main className="shell page">{children}</main>
        <footer className="footer">
          <div className="shell">
            <span>Nexus · 计算机赛事目录</span>
            <span>
              <Link href="/about#sources">来源与核验</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
