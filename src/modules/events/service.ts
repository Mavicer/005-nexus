import { usingD1, d1Store } from "@/db/cloudflare";
import { searchCondition } from "./search";
import { recommendationScore } from "./recommendation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { events, revisions } from "@/db/schema";
import {
  eventSchema,
  listSchema,
  canonicalUrl,
  type EventInput,
} from "./schema";
import { instant, closingBoundary } from "./time";

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type PublicEvent = typeof events.$inferSelect & {
  publishedData: EventInput;
};
function requireRow<T>(row: T | undefined): T {
  if (!row) throw new DomainError("赛事不存在", 404);
  return row;
}

export async function saveDraft(
  input: unknown,
  actor: string,
  id?: string,
  expectedVersion?: number,
) {
  if (usingD1())
    return (await d1Store()).saveDraft(input, actor, id, expectedVersion);
  const payload = eventSchema.parse(input);
  return db.transaction(async (tx) => {
    let event;
    if (id) {
      const current = requireRow(
        (
          await tx.select().from(events).where(eq(events.id, id)).for("update")
        )[0],
      );
      if (current.version !== expectedVersion)
        throw new DomainError("内容已被其他操作修改，请重新加载", 409);
      if (current.slug !== payload.slug)
        throw new DomainError("创建后不能修改稳定链接 slug");
      [event] = await tx
        .update(events)
        .set({
          version: current.version + 1,
          ...(current.status === "published" ? {} : { updatedAt: new Date() }),
        })
        .where(eq(events.id, id))
        .returning();
    } else {
      [event] = await tx
        .insert(events)
        .values({
          slug: payload.slug,
          title: payload.title,
          kind: payload.kind,
          mode: payload.mode,
          createdBy: actor,
        })
        .returning();
    }
    const row = requireRow(event);
    await tx.insert(revisions).values({
      eventId: row.id,
      version: row.version,
      payload,
      createdBy: actor,
    });
    return { id: row.id, version: row.version };
  });
}

export async function changePublication(
  id: string,
  version: number,
  action: "verify" | "publish" | "withdraw" | "flag",
  actor: string,
  reviewMethod: "human" | "agent" = "human",
) {
  if (usingD1())
    return (await d1Store()).changePublication(
      id,
      version,
      action,
      actor,
      reviewMethod,
    );
  return db.transaction(async (tx) => {
    const current = requireRow(
      (
        await tx.select().from(events).where(eq(events.id, id)).for("update")
      )[0],
    );
    if (current.version !== version)
      throw new DomainError("版本冲突，请重新加载后操作", 409);
    const revision = requireRow(
      (
        await tx
          .select()
          .from(revisions)
          .where(and(eq(revisions.eventId, id), eq(revisions.version, version)))
      )[0],
    );
    const payload = eventSchema.parse(revision.payload);
    if (action === "verify") {
      if (revision.note === "withdraw")
        throw new DomainError("下架记录不可直接核验，请先保存新草稿");
      await tx
        .update(revisions)
        .set({ verifiedBy: actor, verifiedAt: new Date(), reviewMethod })
        .where(eq(revisions.id, revision.id));
    } else if (action === "publish") {
      if (!revision.verifiedAt)
        throw new DomainError("此版本尚未核验，不能发布");
      const now = new Date();
      const period = payload.milestones.find((m) => m.kind === "event");
      const eventEnd = period?.end ? closingBoundary(period) : null;
      await tx
        .update(events)
        .set({
          title: payload.title,
          kind: payload.kind,
          mode: payload.mode,
          status: "published",
          reviewState: "verified",
          reviewMethod: revision.reviewMethod,
          publishedData: payload,
          publishedVersion: version,
          identityKey: `${canonicalUrl(payload.officialUrl)}#${payload.edition}`,
          verifiedAt: revision.verifiedAt,
          updatedAt: now,
          registrationOpensAt: instant(
            payload.milestones.find((m) => m.kind === "registration_open"),
          ),
          registrationClosesAt: closingBoundary(
            payload.milestones.find((m) => m.kind === "registration_close"),
          ),
          eventEndsAt: eventEnd,
        })
        .where(eq(events.id, id));
      await tx
        .update(revisions)
        .set({ publishedAt: now })
        .where(eq(revisions.id, revision.id));
    } else if (action === "flag") {
      if (current.status !== "published")
        throw new DomainError("仅公开赛事可标记复核");
      await tx
        .update(events)
        .set({ reviewState: "needs_review", updatedAt: new Date() })
        .where(eq(events.id, id));
    } else {
      // Withdrawal is a new revision, retaining actor and prior public payload.
      const next = version + 1;
      await tx.insert(revisions).values({
        eventId: id,
        version: next,
        payload,
        createdBy: actor,
        note: "withdraw",
      });
      await tx
        .update(events)
        .set({ status: "withdrawn", version: next, updatedAt: new Date() })
        .where(eq(events.id, id));
    }
    return { id, action };
  });
}

export async function getPublicEvent(
  idOrSlug: string,
): Promise<PublicEvent | null> {
  if (usingD1()) return (await d1Store()).getPublicEvent(idOrSlug);
  const byId = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const [row] = await db
    .select()
    .from(events)
    .where(
      and(
        byId ? eq(events.id, idOrSlug) : eq(events.slug, idOrSlug),
        eq(events.status, "published"),
      ),
    )
    .limit(1);
  return row?.publishedData ? (row as PublicEvent) : null;
}

export async function queryEvents(raw: unknown, now = new Date()) {
  if (usingD1()) return (await d1Store()).queryEvents(raw, now);
  const p = listSchema.parse(raw);
  const conditions = [eq(events.status, "published")];
  if (p.state === "open") conditions.push(eq(events.reviewState, "verified"));
  if (p.state === "open" && p.sort === "recommended")
    conditions.push(
      sql`coalesce(${events.publishedData}->>'mainlandEligibility','unknown') != 'ineligible'`,
    );
  if (p.kind) conditions.push(eq(events.kind, p.kind));
  if (p.mode) conditions.push(eq(events.mode, p.mode));
  for (const key of ["region", "entry", "fee"] as const)
    if (p[key])
      conditions.push(
        sql`coalesce(${events.publishedData}->>${key}, 'unknown') = ${p[key]}`,
      );
  if (p.q) conditions.push(searchCondition(p.q));
  if (p.tag) conditions.push(sql`${events.publishedData}->'tags' ? ${p.tag}`);
  const state = sql`CASE WHEN ${events.publishedData}->>'cancellation' IS NOT NULL THEN 'closed'
    WHEN ${events.publishedData}->>'registrationSignal' = 'closed' THEN 'closed'
    WHEN ${events.registrationClosesAt} <= ${now.toISOString()}::timestamptz THEN 'closed'
    WHEN ${events.eventEndsAt} <= ${now.toISOString()}::timestamptz THEN 'closed'
    WHEN ${events.registrationOpensAt} > ${now.toISOString()}::timestamptz THEN 'upcoming'
    WHEN ${events.publishedData}->>'registrationSignal' = 'open' THEN 'open'
    WHEN ${events.publishedData}->>'registration' = 'rolling' THEN CASE WHEN ${events.eventEndsAt} <= ${now.toISOString()}::timestamptz THEN 'closed' ELSE 'open' END
    WHEN ${events.publishedData}->>'registration' = 'window' AND (${events.registrationOpensAt} <= ${now.toISOString()}::timestamptz OR ${events.publishedData}->>'registrationSignal' = 'open') AND ${events.registrationClosesAt} > ${now.toISOString()}::timestamptz THEN 'open' ELSE 'unknown' END`;
  if (p.state !== "all") conditions.push(sql`${state} = ${p.state}`);
  if (p.within)
    conditions.push(
      sql`${events.registrationClosesAt} > ${now.toISOString()}::timestamptz AND ${events.registrationClosesAt} <= ${new Date(now.getTime() + p.within * 86400000).toISOString()}::timestamptz`,
    );
  const where = and(...conditions);
  const [[count], rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(where),
    db
      .select()
      .from(events)
      .where(where)
      .orderBy(
        ...(p.sort === "recommended"
          ? [
              sql`CASE ${state} WHEN 'open' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'unknown' THEN 2 ELSE 3 END ASC`,
              desc(recommendationScore(now)),
              sql`${events.registrationClosesAt} ASC NULLS LAST`,
              asc(events.id),
            ]
          : p.sort === "deadline"
            ? [
                sql`${events.registrationClosesAt} ASC NULLS LAST`,
                desc(events.updatedAt),
                asc(events.id),
              ]
            : [desc(events.updatedAt), asc(events.id)]),
      )
      .limit(p.pageSize)
      .offset((p.page - 1) * p.pageSize),
  ]);
  return {
    items: rows.filter((r): r is PublicEvent => r.publishedData !== null),
    total: count?.total ?? 0,
    params: p,
  };
}
export async function getCalendarRows() {
  if (usingD1()) return (await d1Store()).getCalendarRows();
  return (
    await db.select().from(events).where(eq(events.status, "published"))
  ).filter((r): r is PublicEvent => r.publishedData !== null);
}
export async function listAdminEvents() {
  if (usingD1()) return (await d1Store()).listAdminEvents();
  return db.select().from(events).orderBy(desc(events.updatedAt));
}
export async function getAdminEvent(id: string) {
  if (usingD1()) return (await d1Store()).getAdminEvent(id);
  const event = (
    await db.select().from(events).where(eq(events.id, id)).limit(1)
  )[0];
  if (!event) return null;
  const history = await db
    .select()
    .from(revisions)
    .where(eq(revisions.eventId, id))
    .orderBy(desc(revisions.version));
  return { event, revision: history[0]!, history };
}

export function publicEventData(row: PublicEvent) {
  return {
    id: row.id,
    slug: row.slug,
    publishedData: row.publishedData,
    publishedVersion: row.publishedVersion,
    reviewState: row.reviewState,
    reviewMethod: row.reviewMethod,
    verifiedAt: row.verifiedAt,
    updatedAt: row.updatedAt,
  };
}
