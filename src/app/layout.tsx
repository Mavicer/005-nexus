import { SiteHeader } from "@/components/events/site-header";
import { Suspense } from "react";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import {
  appearanceSnapshot,
  appearanceStyle,
  effectiveTheme,
} from "@/modules/events/appearance";
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
  let initialAppearance = null;
  try {
    const value = (await cookies()).get("MAVICER_APPEARANCE_SHARED")?.value;
    if (value && value.length < 4096) {
      const parsed = appearanceSnapshot.safeParse(
        JSON.parse(decodeURIComponent(value)),
      );
      if (parsed.success) initialAppearance = parsed.data;
    }
  } catch {}
  const appearanceOrigin = process.env.BLOG_APPEARANCE_ORIGIN ?? blogOrigin();
  const style = appearanceStyle(initialAppearance, appearanceOrigin);
  return (
    <html
      lang="zh-CN"
      style={style as CSSProperties}
      data-blog-appearance={style ? "synced" : undefined}
      data-blog-theme={
        style && initialAppearance
          ? effectiveTheme(initialAppearance.theme)
          : undefined
      }
      suppressHydrationWarning
    >
      <body>
        <BlogAppearanceSync
          initial={initialAppearance}
          origin={process.env.BLOG_APPEARANCE_ORIGIN ?? blogOrigin()}
        />
        {blogSsoEnabled() && <SessionRefresh />}
        <SiteHeader>
          <Link href="/">发现赛事</Link>
          <Link href="/calendar">赛事日历</Link>
          <Link href="/saved">我的收藏</Link>
          <Link href="/database">数据库</Link>
          <Suspense fallback={<Link href="/account">账号</Link>}>
            <AccountNavigation />
          </Suspense>
          <a href={blogOrigin()}>
            返回博客 <span aria-hidden="true">↗</span>
          </a>
        </SiteHeader>
        <main className="shell page">{children}</main>
        <footer className="footer">
          <div className="shell">
            <span>Nexus · 计算机赛事目录</span>
            <span>
              <Link href="/database">竞赛资料库</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}

async function AccountNavigation() {
  const user = await getCurrentUser();
  return (
    <>
      {user?.isAdmin && <Link href="/admin/events">管理</Link>}
      <Link href={user ? "/account" : "/login"}>
        {user ? "账号" : "登录 ↗"}
      </Link>
    </>
  );
}
