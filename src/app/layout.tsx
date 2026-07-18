import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "大学学习通 | 大学生一站式信息平台",
  description:
    "整合竞赛、科研、考试、奖学金、保研、发展机会等大学阶段重要信息，建立可靠、高效的信息检索系统，降低信息差。",
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
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
