import type { Metadata } from "next";
import Link from "next/link";
import {
  resourceCollections,
  RESOURCE_TYPES,
  findResources,
  type ResourceType,
} from "@/modules/resources/catalog";

export const metadata: Metadata = {
  title: "数据库",
  description: "按比赛整理规则、赛题、工具与优秀作品。",
};

export default async function Database({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const competition =
    typeof params.competition === "string" ? params.competition : "";
  const kind = typeof params.kind === "string" ? params.kind : "";
  const items = findResources(competition, kind);
  return (
    <div className="stack">
      <div>
        <h1>数据库</h1>
        <p className="muted">比赛规则、赛题资料与作品参考，按比赛整理。</p>
      </div>
      <form className="panel resource-filters" action="/database">
        <label>
          比赛
          <select name="competition" defaultValue={competition}>
            <option value="">全部比赛</option>
            {resourceCollections.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.shortName}
              </option>
            ))}
          </select>
        </label>
        <label>
          资料类型
          <select name="kind" defaultValue={kind}>
            <option value="">全部资料</option>
            {Object.entries(RESOURCE_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" type="submit">
          查看
        </button>
        {(competition || kind) && (
          <Link className="btn" href="/database">
            全部资料
          </Link>
        )}
      </form>
      {!items.length && (
        <div className="panel empty">
          <h2>暂无对应资料</h2>
          <Link className="btn" href="/database">
            查看全部资料
          </Link>
        </div>
      )}
      <div className="resource-grid">
        {items.map((item) => (
          <section className="panel resource-card" key={item.slug}>
            <div className="card-top">
              <div>
                <span className="type">{item.shortName}</span>
                <h2>{item.name}</h2>
              </div>
              <Link className="small muted" href={`/events/${item.slug}`}>
                赛事详情 ↗
              </Link>
            </div>
            <div className="resource-list">
              {item.resources.map((resource) => (
                <a
                  key={resource.url}
                  className="resource-item"
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="resource-meta">
                    <span>{RESOURCE_TYPES[resource.kind as ResourceType]}</span>
                    <span>
                      {resource.year} · {resource.format}
                    </span>
                  </div>
                  <strong>
                    {resource.title} <span aria-hidden="true">↗</span>
                  </strong>
                  <p className="small muted">{resource.description}</p>
                  <span className="small muted">{resource.source}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
