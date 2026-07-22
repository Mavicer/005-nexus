import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Nexus | 大学资源探索平台",
  description:
    "Nexus — 整合竞赛、科研、保研、实习等大学阶段机会信息，建立可靠、高效的资源检索与时间管理系统，降低信息差。",
  keywords: [
    "大学生",
    "竞赛",
    "保研",
    "科研",
    "考试",
    "实习",
    "资源日历",
    "信息平台",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
