"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty">
      <h1>页面暂时无法加载</h1>
      <p>这不是没有数据。请稍后重试。</p>
      <button className="btn" onClick={reset}>
        重新加载
      </button>
    </div>
  );
}
