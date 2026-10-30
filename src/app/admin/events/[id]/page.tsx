import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getAdminEvent } from "@/modules/events/service";
import { EventEditor } from "@/components/events/editor";
import { uuidSchema } from "@/lib/http";
export const dynamic = "force-dynamic";
export default async function EditEvent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireAdminPage())) return <h1>需要管理员权限</h1>;
  const id = uuidSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const row = await getAdminEvent(id.data);
  if (!row) notFound();
  return (
    <>
      <h1>编辑赛事</h1>
      <EventEditor
        id={row.event.id}
        initial={row.revision.payload}
        initialVersion={row.event.version}
        initialVerified={!!row.revision.verifiedAt}
      />
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>版本记录</h2>
        {row.history.map((r) => (
          <p className="small muted" key={r.id}>
            v{r.version} · {r.createdAt.toISOString()} ·{" "}
            {r.note === "withdraw"
              ? "下架记录"
              : r.publishedAt
                ? "已发布"
                : r.verifiedAt
                  ? "已核验，未发布"
                  : "未核验草稿"}
          </p>
        ))}
      </section>
    </>
  );
}
