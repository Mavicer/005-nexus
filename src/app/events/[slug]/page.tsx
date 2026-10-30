import { editorialAssessment } from "@/modules/events/editorial";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicEvent } from "@/modules/events/service";
import { getCurrentUser } from "@/lib/auth";
import { hasBookmark } from "@/modules/bookmarks/service";
import { KIND_LABELS, MODE_LABELS } from "@/modules/events/schema";
import {
  displayTime,
  registrationState,
  STATE_LABELS,
} from "@/modules/events/time";
import { BookmarkButton } from "@/components/events/bookmark-button";
export const dynamic = "force-dynamic";
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const row = await getPublicEvent((await params).slug);
  if (!row) notFound();
  const e = row.publishedData,
    user = await getCurrentUser(),
    saved = user ? await hasBookmark(user.userId, row.id) : false,
    state = registrationState(e);
  return (
    <>
      <Link className="small muted" href="/">
        ← 返回赛事发现
      </Link>
      <header className="panel detail-heading" style={{ marginTop: 20 }}>
        <div className="card-top">
          <span className="type">
            {KIND_LABELS[e.kind]} · {e.edition}
          </span>
          <span className={`status ${state}`}>{STATE_LABELS[state]}</span>
        </div>
        <h1>{e.title}</h1>
        {e.officialName && <p className="small muted">{e.officialName}</p>}
        <p className="muted small">{e.summary}</p>
        <p className="small">
          <strong>本站判断 · {editorialAssessment(row.slug).label}：</strong>
          {editorialAssessment(row.slug).reason}
        </p>
        <div className="facts">
          {MODE_LABELS[e.mode]}
          {e.location === MODE_LABELS[e.mode] ? "" : ` · ${e.location}`}　/　
          {e.organizer}
        </div>
        <div className="actions">
          <a
            className="btn primary"
            href={e.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {state === "open" && row.reviewState === "verified"
              ? "前往官方报名 ↗"
              : "查看官方规则 ↗"}
          </a>
          <BookmarkButton id={row.id} slug={row.slug} initial={saved} />
          <a className="btn" href={`/api/events/${row.id}/calendar`}>
            导出日历 ↓
          </a>
        </div>
      </header>
      {row.reviewState === "needs_review" && (
        <div className="notice warn">
          此活动规则待复核，下面保留上次核验内容。行动前请先向官方确认。
        </div>
      )}
      {e.cancellation && (
        <div className="notice warn">官方变更：{e.cancellation}</div>
      )}
      <div className="split">
        <div className="stack">
          <Block title="参赛资格">
            {e.eligibilityStatus === "unknown" && (
              <p className="small muted">尚未明确的资格条件需向主办方确认。</p>
            )}
            <p className="prose">{e.eligibility}</p>
            <p className="small">
              <strong>组队要求：</strong>
              {e.team}
            </p>
          </Block>
          {!!e.registrationSteps?.length && (
            <Block
              title={state === "closed" ? "本届报名流程（已截止）" : "报名流程"}
            >
              <ol className="event-checklist">
                {e.registrationSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Block>
          )}
          <Block title="提交要求">
            <p className="prose">{e.deliverables}</p>
            {!!e.submissionChecklist?.length && (
              <ul className="event-checklist">
                {e.submissionChecklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            <div className="tags">
              {e.tags.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </Block>
          <Block title="费用与规则">
            <p className="prose">{e.costs}</p>
            <p className="prose muted">{e.rules}</p>
          </Block>
          <a
            className="small"
            style={{ color: "var(--accent)" }}
            href={e.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            官方来源 ↗
          </a>
        </div>
        <aside className="panel">
          <h2>赛程</h2>
          {e.milestones.length ? (
            e.milestones.map((m) => (
              <div className="timeline-item" key={m.id}>
                <strong>{m.label}</strong>
                <p>{displayTime(m)}</p>
                <p>原文：{m.raw}</p>
              </div>
            ))
          ) : (
            <p className="muted small">时间待官方公布</p>
          )}
          <p className="small muted" style={{ marginTop: 24 }}>
            精确时刻按北京时间显示；日历导出为一次性快照，不会自动同步延期。
          </p>
        </aside>
      </div>
    </>
  );
}
function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
