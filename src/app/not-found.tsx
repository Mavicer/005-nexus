import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel empty">
      <h1>这个活动暂不可见</h1>
      <p>它可能尚未发布、已下架或链接有误。</p>
      <Link className="btn primary" href="/">
        返回赛事发现
      </Link>
    </div>
  );
}
