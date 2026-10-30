import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks, events } from "@/db/schema";
import { DomainError } from "@/modules/events/service";
export async function addBookmark(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.status, "published")))
      .for("share");
    if (!row) throw new DomainError("赛事不存在或已下架", 404);
    await tx
      .insert(bookmarks)
      .values({ userId, eventId })
      .onConflictDoNothing();
  });
}
export async function removeBookmark(userId: string, eventId: string) {
  await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.eventId, eventId)));
}
export async function hasBookmark(userId: string, eventId: string) {
  return (
    (
      await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(eq(bookmarks.userId, userId), eq(bookmarks.eventId, eventId)),
        )
        .limit(1)
    ).length > 0
  );
}
export async function listBookmarks(userId: string) {
  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      status: events.status,
      payload: events.publishedData,
      verifiedAt: events.verifiedAt,
      createdAt: bookmarks.createdAt,
    })
    .from(bookmarks)
    .innerJoin(events, eq(events.id, bookmarks.eventId))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
  return rows.map((r) =>
    r.status === "published"
      ? r
      : { ...r, slug: "", payload: null, verifiedAt: null },
  );
}
