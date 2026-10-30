import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { listAdminEvents } from "@/modules/events/service";
export const dynamic = "force-dynamic";
export default async function Admin() {
  if (!(await requireAdminPage()))
    return (
      <div className="panel empty">
        <h1>需要管理员权限</h1>
        <Link href="/login?next=/admin/events" className="btn">
          登录
        </Link>
      </div>
    );
  const rows = await listAdminEvents();
  return (
    <>
      <div className="intro">
        <div>
          <h1>赛事管理</h1>
          <p className="muted">保存草稿 → 核对依据 → 记录核验 → 发布。</p>
        </div>
        <Link href="/admin/events/new" className="btn primary">
          ＋ 收录活动
        </Link>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>活动</th>
              <th>公开状态</th>
              <th>最新 / 公开版本</th>
              <th>核验</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link
                    href={`/admin/events/${r.id}`}
                    style={{ color: "var(--accent)" }}
                  >
                    {r.title}
                  </Link>
                </td>
                <td>
                  {{ draft: "草稿", published: "已公开", withdrawn: "已下架" }[
                    r.status
                  ] ?? r.status}
                </td>
                <td>
                  v{r.version} /{" "}
                  {r.publishedVersion ? `v${r.publishedVersion}` : "—"}
                </td>
                <td>
                  {r.reviewState === "needs_review"
                    ? "待复核"
                    : (r.verifiedAt?.toISOString().slice(0, 10) ?? "未核验")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="muted small">尚未收录活动，从第一份官方规则开始。</p>
        )}
      </div>
    </>
  );
}
