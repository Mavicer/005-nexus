import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listBookmarks } from "@/modules/bookmarks/service";
import { BookmarkButton } from "@/components/events/bookmark-button";
import { STATE_LABELS, registrationState } from "@/modules/events/time";
export const dynamic = "force-dynamic";
export default async function Saved() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <div className="panel empty">
        <h1>登录后查看收藏</h1>
        <Link className="btn primary" href="/login?next=/saved">
          登录 / 注册
        </Link>
      </div>
    );
  const rows = await listBookmarks(user.userId);
  return (
    <>
      <div className="intro">
        <div>
          <h1>我的收藏</h1>
        </div>
        <Link className="btn" href="/">
          继续发现 ↗
        </Link>
      </div>
      <div className="stack">
        {rows.length ? (
          rows.map((r) => (
            <article className="panel" key={r.id}>
              {r.payload ? (
                <>
                  <div className="card-top">
                    <h2>
                      <Link href={`/events/${r.slug}`}>
                        {r.payload.title} ↗
                      </Link>
                    </h2>
                    <span className="status">
                      {STATE_LABELS[registrationState(r.payload)]}
                    </span>
                  </div>
                  <p className="muted small">{r.payload.summary}</p>
                </>
              ) : (
                <>
                  <h2>此活动已下架</h2>
                  <p className="muted small">
                    保留收藏关系，活动内容不再公开。
                  </p>
                </>
              )}
              <BookmarkButton id={r.id} slug={r.slug} initial={true} />
            </article>
          ))
        ) : (
          <div className="panel empty">
            <h2>还没有收藏</h2>
            <p>从赛事详情收藏感兴趣的活动，随时回来查看。</p>
          </div>
        )}
      </div>
    </>
  );
}
