import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { users, events } from "@/db/schema";
import { eventSchema } from "@/modules/events/schema";
import {
  saveDraft,
  getAdminEvent,
  changePublication,
} from "@/modules/events/service";
try {
  const path = process.argv[2];
  if (!path || !process.env.DATABASE_URL)
    throw new Error(
      "用法：显式设置 DATABASE_URL、ADMIN_EMAIL 后运行 db:import 文件.json [--reviewed --publish]",
    );
  const [actor] = await db
    .select()
    .from(users)
    .where(eq(users.email, process.env.ADMIN_EMAIL ?? ""));
  if (!actor?.isAdmin) throw new Error("ADMIN_EMAIL 必须是已存在管理员");
  if (
    process.argv.includes("--publish") &&
    !process.argv.includes("--reviewed")
  )
    throw new Error("发布必须显式确认已阅读并核验全部原始规则：--reviewed");
  const batch = z
    .array(eventSchema)
    .min(1)
    .max(100)
    .parse(JSON.parse(await readFile(path, "utf8")));
  if (new Set(batch.map((x) => x.slug)).size !== batch.length)
    throw new Error("批次包含重复 slug");
  for (const payload of batch) {
    const [existing] = await db
      .select()
      .from(events)
      .where(eq(events.slug, payload.slug));
    const current = existing ? await getAdminEvent(existing.id) : null;
    const same =
      current &&
      isDeepStrictEqual(eventSchema.parse(current.revision.payload), payload);
    if (
      same &&
      process.argv.includes("--publish") &&
      existing?.status === "published" &&
      existing.publishedVersion === existing.version &&
      existing.reviewState === "verified"
    ) {
      console.log(
        JSON.stringify({
          id: existing.id,
          version: existing.version,
          slug: payload.slug,
          result: "unchanged",
        }),
      );
      continue;
    }
    const draft = same
      ? { id: existing!.id, version: existing!.version }
      : await saveDraft(payload, actor.id, existing?.id, existing?.version);
    if (process.argv.includes("--reviewed"))
      await changePublication(
        draft.id,
        draft.version,
        "verify",
        actor.id,
        "agent",
      );
    if (process.argv.includes("--publish"))
      await changePublication(draft.id, draft.version, "publish", actor.id);
    console.log(
      JSON.stringify({
        ...draft,
        slug: payload.slug,
        result: process.argv.includes("--publish")
          ? "published"
          : process.argv.includes("--reviewed")
            ? "verified_draft"
            : "unreviewed_draft",
      }),
    );
  }
} finally {
  await pool.end();
}
