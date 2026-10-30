import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { legacyMap, events } from "@/db/schema";
import { uuidSchema } from "@/lib/http";
export const dynamic = "force-dynamic";
export default async function OldDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = uuidSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [mapping] = await db
    .select({ eventId: legacyMap.eventId })
    .from(legacyMap)
    .where(eq(legacyMap.legacyId, id.data));
  if (!mapping?.eventId) notFound();
  const [event] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, mapping.eventId));
  if (!event) notFound();
  redirect(`/events/${event.slug}`);
}
