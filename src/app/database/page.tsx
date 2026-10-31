import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "数据库",
  description: "竞赛资料库，敬请期待。",
};

export default function Database() {
  return (
    <div className="panel empty" style={{ maxWidth: 760, margin: "40px auto" }}>
      <h1>数据库</h1>
      <p className="muted" style={{ margin: "24px 0" }}>
        该功能暂未上线，敬请期待。
      </p>
      <Link className="btn" href="/">返回赛事发现</Link>
    </div>
  );
}
