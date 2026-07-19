import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Nexus | University Growth Navigation OS",
  description:
    "Nexus — 大学生成长导航操作系统。整合竞赛、科研、保研、实习等大学阶段机会信息，建立可靠、高效的信息检索系统，降低信息差。",
  keywords: [
    "大学生",
    "竞赛",
    "保研",
    "奖学金",
    "科研",
    "考试",
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
