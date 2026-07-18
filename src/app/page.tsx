/**
 * 占位首页 — 工程化基线阶段
 * 待 Agent B 给出 P1 竞赛 schema 后，此处接入搜索与竞赛列表
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">大学学习通</h1>
      <p className="text-center text-neutral-600">
        面向国内大学生的一站式信息平台
      </p>
      <p className="text-sm text-neutral-400">工程化基线已就绪 · MVP 开发中</p>
    </main>
  );
}
