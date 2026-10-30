import { editorialAssessment } from "@/modules/events/editorial";
import { directoryLabel, directoryMatch } from "@/modules/events/directory";
import Link from "next/link";
import type { PublicEvent } from "@/modules/events/service";
import {
  KIND_LABELS,
  MODE_LABELS,
  ENTRY_LABELS,
  FEE_LABELS,
} from "@/modules/events/schema";
import {
  displayTime,
  registrationState,
  STATE_LABELS,
} from "@/modules/events/time";
export function EventCard({ event }: { event: PublicEvent }) {
  const e = event.publishedData;
  const state = registrationState(e);
  const deadline = e.milestones.find((m) => m.kind === "registration_close");
  return (
    <article className="panel event-card">
      <div className="card-top">
        <span className="type">{KIND_LABELS[e.kind]}</span>
        <span className={`status ${state}`}>{STATE_LABELS[state]}</span>
      </div>
      <h2>
        <Link prefetch={true} href={`/events/${event.slug}`}>
          {e.title}
        </Link>
      </h2>
      <div className="facts">
        {MODE_LABELS[e.mode]}
        {e.location === MODE_LABELS[e.mode] ? "" : ` · ${e.location}`}
        <br />
        {e.team}
      </div>
      <div className="tags">
        <span className="tag" title={editorialAssessment(event.slug).reason}>
          本站判断 · {editorialAssessment(event.slug).label}
        </span>
        {directoryLabel(event.slug) && (
          <span className="tag" title={directoryMatch(event.slug)?.name}>
            {directoryLabel(event.slug)}
          </span>
        )}
      </div>
      <div className="event-access">
        <span>{ENTRY_LABELS[e.entry ?? "unknown"]}</span>
        <span>{FEE_LABELS[e.fee ?? "unknown"]}</span>
      </div>
      <p>{e.summary}</p>
      <div className="tags">
        {e.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="facts">
        <strong>报名截止</strong>　
        {deadline
          ? displayTime(deadline)
          : e.registration === "rolling"
            ? "滚动报名，查看官方要求"
            : "待官方公布"}
      </div>
      <div className="card-bottom">
        <span className="verified">
          {event.reviewState === "needs_review"
            ? "规则待复核"
            : `核验于 ${event.verifiedAt?.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) ?? "—"}`}
        </span>
        <Link prefetch={true} href={`/events/${event.slug}`}>
          查看详情 ↗
        </Link>
      </div>
    </article>
  );
}
