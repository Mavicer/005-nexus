import type { D1DatabaseSession } from "@cloudflare/workers-types";
import type { events, revisions } from "./schema";
import {
  eventSchema,
  listSchema,
  canonicalUrl,
  type EventInput,
} from "@/modules/events/schema";
import { closingBoundary, instant } from "@/modules/events/time";
import {
  searchTerms,
  escapeLike,
  searchTopic,
  searchMode,
} from "@/modules/events/search";
import { DomainError, type PublicEvent } from "@/modules/events/service";

type Row = Record<string, unknown>;
const dates = new Set([
  "createdAt",
  "updatedAt",
  "verifiedAt",
  "eventEndsAt",
  "registrationOpensAt",
  "registrationClosesAt",
  "publishedAt",
]);
function decode<T>(row: Row): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const name = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      if (value !== null && dates.has(name)) value = new Date(String(value));
      if (
        (name === "publishedData" || name === "payload") &&
        typeof value === "string"
      )
        value = eventSchema.parse(JSON.parse(value));
      return [name, value];
    }),
  ) as T;
}
function required<T>(value: T | null): T {
  if (!value) throw new DomainError("赛事不存在", 404);
  return value;
}
function conflict() {
  throw new DomainError("内容已被其他操作修改，请重新加载", 409);
}
export class D1Store {
  constructor(private db: D1DatabaseSession) {}
  private stmt(sql: string, values: unknown[] = []) {
    return this.db.prepare(sql).bind(...values);
  }
  private async rows<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    const result = await this.stmt(sql, values).all<Row>();
    return result.results.map((r) => decode<T>(r));
  }
  async getPublicEvent(idOrSlug: string): Promise<PublicEvent | null> {
    const field = /^[0-9a-f-]{36}$/i.test(idOrSlug) ? "id" : "slug";
    return (
      (
        await this.rows<PublicEvent>(
          `SELECT * FROM nexus_events WHERE ${field}=? AND status='published' AND published_data IS NOT NULL LIMIT 1`,
          [idOrSlug],
        )
      )[0] ?? null
    );
  }
  async getCalendarRows() {
    return this.rows<PublicEvent>(
      "SELECT * FROM nexus_events WHERE status='published' AND published_data IS NOT NULL",
    );
  }
  async listAdminEvents() {
    return this.rows<typeof events.$inferSelect>(
      "SELECT * FROM nexus_events ORDER BY updated_at DESC",
    );
  }
  async getAdminEvent(id: string) {
    const [event] = await this.rows<typeof events.$inferSelect>(
      "SELECT * FROM nexus_events WHERE id=?",
      [id],
    );
    if (!event) return null;
    const history = await this.rows<typeof revisions.$inferSelect>(
      "SELECT * FROM nexus_event_revisions WHERE event_id=? ORDER BY version DESC",
      [id],
    );
    return { event, revision: history[0]!, history };
  }
  async saveDraft(
    input: unknown,
    actor: string,
    id?: string,
    expectedVersion?: number,
  ) {
    const payload = eventSchema.parse(input),
      now = new Date().toISOString();
    if (!id) {
      id = crypto.randomUUID();
      await this.db.batch<Row>([
        this.stmt(
          "INSERT INTO nexus_events(id,slug,title,kind,mode,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
          [
            id,
            payload.slug,
            payload.title,
            payload.kind,
            payload.mode,
            actor,
            now,
            now,
          ],
        ),
        this.stmt(
          "INSERT INTO nexus_event_revisions(id,event_id,version,payload,created_by,created_at) VALUES(?,?,1,?,?,?)",
          [crypto.randomUUID(), id, JSON.stringify(payload), actor, now],
        ),
      ]);
      return { id, version: 1 };
    }
    const current = required(await this.getAdminEvent(id));
    if (current.event.version !== expectedVersion) conflict();
    if (current.event.slug !== payload.slug)
      throw new DomainError("创建后不能修改稳定链接 slug");
    const next = current.event.version + 1;
    // A duplicate revision aborts the whole D1 batch if another editor wins.
    const results = await this.db.batch<Row>([
      this.stmt(
        "INSERT INTO nexus_event_revisions(id,event_id,version,payload,created_by,created_at) SELECT ?,id,version+1,?,?,? FROM nexus_events WHERE id=? AND version=?",
        [
          crypto.randomUUID(),
          JSON.stringify(payload),
          actor,
          now,
          id,
          expectedVersion,
        ],
      ),
      this.stmt(
        "UPDATE nexus_events SET version=version+1, updated_at=CASE WHEN status='published' THEN updated_at ELSE ? END WHERE id=? AND version=?",
        [now, id, expectedVersion],
      ),
    ]);
    if (!results[0]!.meta.changes || !results[1]!.meta.changes) conflict();
    return { id, version: next };
  }
  async changePublication(
    id: string,
    version: number,
    action: "verify" | "publish" | "withdraw" | "flag",
    actor: string,
    method: "human" | "agent" = "human",
  ) {
    const current = required(await this.getAdminEvent(id));
    if (current.event.version !== version) conflict();
    const revision = current.revision,
      p = eventSchema.parse(revision.payload),
      now = new Date().toISOString();
    const guard =
      "EXISTS(SELECT 1 FROM nexus_events e WHERE e.id=? AND e.version=?)";
    if (action === "verify") {
      if (revision.note === "withdraw")
        throw new DomainError("下架记录不可直接核验，请先保存新草稿");
      const r = await this.stmt(
        `UPDATE nexus_event_revisions SET verified_by=?,verified_at=?,review_method=? WHERE id=? AND ${guard}`,
        [actor, now, method, revision.id, id, version],
      ).run();
      if (!r.meta.changes) conflict();
    } else if (action === "publish") {
      if (!revision.verifiedAt)
        throw new DomainError("此版本尚未核验，不能发布");
      const period = p.milestones.find((m) => m.kind === "event");
      const iso = (v: Date | null) => v?.toISOString() ?? null;
      const results = await this.db.batch<Row>([
        this.stmt(
          "UPDATE nexus_events SET title=?,kind=?,mode=?,status='published',review_state='verified',review_method=?,published_data=?,published_version=?,identity_key=?,verified_at=?,updated_at=?,registration_opens_at=?,registration_closes_at=?,event_ends_at=? WHERE id=? AND version=?",
          [
            p.title,
            p.kind,
            p.mode,
            revision.reviewMethod,
            JSON.stringify(p),
            version,
            `${canonicalUrl(p.officialUrl)}#${p.edition}`,
            iso(revision.verifiedAt),
            now,
            iso(
              instant(p.milestones.find((m) => m.kind === "registration_open")),
            ),
            iso(
              closingBoundary(
                p.milestones.find((m) => m.kind === "registration_close"),
              ),
            ),
            iso(period?.end ? closingBoundary(period) : null),
            id,
            version,
          ],
        ),
        this.stmt(
          `UPDATE nexus_event_revisions SET published_at=? WHERE id=? AND ${guard}`,
          [now, revision.id, id, version],
        ),
      ]);
      if (!results[0]!.meta.changes) conflict();
    } else if (action === "flag") {
      if (current.event.status !== "published")
        throw new DomainError("仅公开赛事可标记复核");
      const r = await this.stmt(
        "UPDATE nexus_events SET review_state='needs_review',updated_at=? WHERE id=? AND version=? AND status='published'",
        [now, id, version],
      ).run();
      if (!r.meta.changes) conflict();
    } else {
      const results = await this.db.batch<Row>([
        this.stmt(
          "INSERT INTO nexus_event_revisions(id,event_id,version,payload,created_by,created_at,note) SELECT ?,id,version+1,?,?,?,'withdraw' FROM nexus_events WHERE id=? AND version=?",
          [crypto.randomUUID(), JSON.stringify(p), actor, now, id, version],
        ),
        this.stmt(
          "UPDATE nexus_events SET status='withdrawn',version=version+1,updated_at=? WHERE id=? AND version=?",
          [now, id, version],
        ),
      ]);
      if (!results[0]!.meta.changes) conflict();
    }
    return { id, action };
  }
  async queryEvents(raw: unknown, now = new Date()) {
    const p = listSchema.parse(raw),
      args: unknown[] = [],
      conditions = ["status='published'", "published_data IS NOT NULL"];
    const param = (value: unknown) => {
      args.push(value);
      return "?";
    };
    const j = (key: string) => `json_extract(published_data,'$.${key}')`;
    const state = `CASE WHEN ${j("cancellation")} IS NOT NULL OR ${j("registrationSignal")}='closed' OR registration_closes_at <= ${param(now.toISOString())} OR event_ends_at <= ${param(now.toISOString())} THEN 'closed' WHEN registration_opens_at > ${param(now.toISOString())} THEN 'upcoming' WHEN ${j("registrationSignal")}='open' OR ${j("registration")}='rolling' THEN 'open' WHEN ${j("registration")}='window' AND registration_opens_at <= ${param(now.toISOString())} AND registration_closes_at > ${param(now.toISOString())} THEN 'open' ELSE 'unknown' END`;
    // Build one CTE so all date parameters precede optional filters consistently.
    const filterArgs: unknown[] = [];
    const bind = (v: unknown) => {
      filterArgs.push(v);
      return "?";
    };
    if (p.state === "open") conditions.push("review_state='verified'");
    if (p.state === "open" && p.sort === "recommended")
      conditions.push(
        `coalesce(${j("mainlandEligibility")},'unknown')!='ineligible'`,
      );
    if (p.kind) conditions.push(`kind=${bind(p.kind)}`);
    if (p.mode) conditions.push(`mode=${bind(p.mode)}`);
    for (const key of ["region", "entry", "fee"] as const)
      if (p[key])
        conditions.push(`coalesce(${j(key)},'unknown')=${bind(p[key])}`);
    if (p.state !== "all")
      conditions.push(`registration_state=${bind(p.state)}`);
    if (p.tag)
      conditions.push(
        `EXISTS(SELECT 1 FROM json_each(${j("tags")}) WHERE value=${bind(p.tag)})`,
      );
    if (p.within)
      conditions.push(
        `registration_closes_at > ${bind(now.toISOString())} AND registration_closes_at <= ${bind(new Date(+now + p.within * 86400000).toISOString())}`,
      );
    const text = [
      "title",
      ...[
        "officialName",
        "series",
        "summary",
        "deliverables",
        "eligibility",
        "organizer",
        "tags",
      ].map((k) => j(k)),
    ]
      .map((s) => `coalesce(${s},'')`)
      .join(" || ' ' || ");
    for (const term of searchTerms(p.q)) {
      const mode = searchMode(term),
        topic = searchTopic(term);
      if (mode) conditions.push(`mode=${bind(mode)}`);
      else
        conditions.push(
          `(lower(${text}) LIKE ${bind("%" + escapeLike(term) + "%")} ESCAPE '\\'${topic ? ` OR kind=${bind(topic)}` : ""})`,
        );
    }
    const score = `CASE WHEN ${j("mainlandEligibility")}='ineligible' THEN -5000 WHEN mode='online' AND ${j("entry")}='direct' AND ${j("mainlandEligibility")}='eligible' THEN 1000 WHEN ${j("region")}='domestic' THEN 700 WHEN mode='online' THEN 400 WHEN mode='hybrid' THEN 200 ELSE 0 END
      + CASE kind WHEN 'hackathon' THEN 50 WHEN 'developer_challenge' THEN 40 ELSE 0 END
      + CASE ${j("fee")} WHEN 'free' THEN 20 WHEN 'paid' THEN -20 ELSE 0 END
      + CASE WHEN coalesce(${j("mainlandEligibility")},'unknown')='unknown' THEN -100 ELSE 0 END
      + CASE ${j("entry")} WHEN 'qualification' THEN -60 WHEN 'application' THEN -30 ELSE 0 END
      + CASE WHEN julianday(registration_closes_at)-julianday(${bind(now.toISOString())}) > 3 AND julianday(registration_closes_at)-julianday(${bind(now.toISOString())}) <=30 THEN 25 WHEN julianday(registration_closes_at)-julianday(${bind(now.toISOString())}) <=1 THEN -30 ELSE 0 END
      + CASE WHEN julianday(verified_at)>=julianday(${bind(now.toISOString())})-14 THEN 10 ELSE 0 END
      + CASE WHEN review_state='needs_review' THEN -3000 ELSE 0 END`;
    // Score bindings belong after WHERE, and count does not use score bindings.
    const scoreArgs = filterArgs.splice(filterArgs.length - 4, 4);
    const cte = `WITH catalog AS (SELECT *, ${state} AS registration_state FROM nexus_events)`;
    const where = conditions.join(" AND ");
    const order =
      p.sort === "recommended"
        ? `CASE registration_state WHEN 'open' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'unknown' THEN 2 ELSE 3 END, (${score}) DESC, registration_closes_at ASC NULLS LAST,id ASC`
        : p.sort === "deadline"
          ? "registration_closes_at ASC NULLS LAST,updated_at DESC,id ASC"
          : "updated_at DESC,id ASC";
    const results = await this.db.batch<Row>([
      this.stmt(`${cte} SELECT count(*) AS total FROM catalog WHERE ${where}`, [
        ...args,
        ...filterArgs,
      ]),
      this.stmt(
        `${cte} SELECT * FROM catalog WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
        [
          ...args,
          ...filterArgs,
          ...(p.sort === "recommended" ? scoreArgs : []),
          p.pageSize,
          (p.page - 1) * p.pageSize,
        ],
      ),
    ]);
    return {
      items: results[1]!.results.map((r) => decode<PublicEvent>(r)),
      total: Number(results[0]!.results[0]?.total ?? 0),
      params: p,
    };
  }
  async addBookmark(userId: string, eventId: string) {
    const r = await this.stmt(
      "INSERT OR IGNORE INTO nexus_bookmarks(id,user_id,event_id,created_at) SELECT ?,?,id,? FROM nexus_events WHERE id=? AND status='published'",
      [crypto.randomUUID(), userId, new Date().toISOString(), eventId],
    ).run();
    if (!r.meta.changes && !(await this.getPublicEvent(eventId)))
      throw new DomainError("赛事不存在或已下架", 404);
  }
  async removeBookmark(userId: string, eventId: string) {
    await this.stmt(
      "DELETE FROM nexus_bookmarks WHERE user_id=? AND event_id=?",
      [userId, eventId],
    ).run();
  }
  async hasBookmark(userId: string, eventId: string) {
    return !!(await this.stmt(
      "SELECT id FROM nexus_bookmarks WHERE user_id=? AND event_id=?",
      [userId, eventId],
    ).first());
  }
  async listBookmarks(userId: string) {
    const rows = await this.rows<{
      id: string;
      slug: string;
      status: string;
      payload: EventInput | null;
      verifiedAt: Date | null;
      createdAt: Date;
    }>(
      "SELECT e.id,e.slug,e.status,e.published_data AS payload,e.verified_at,b.created_at FROM nexus_bookmarks b JOIN nexus_events e ON e.id=b.event_id WHERE b.user_id=? ORDER BY b.created_at DESC",
      [userId],
    );
    return rows.map((r) =>
      r.status === "published"
        ? r
        : { ...r, slug: "", payload: null, verifiedAt: null },
    );
  }
  async identity(issuer: string, subject: string, name: string) {
    // Uniqueness is enforced in D1; concurrent first sign-ins converge on one user.
    const now = new Date().toISOString(),
      id = crypto.randomUUID();
    const results = await this.db.batch<Row>([
      this.stmt(
        "INSERT INTO users(id,email,name,created_at,updated_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM nexus_blog_identities WHERE issuer=? AND subject=?)",
        [id, `blog-${id}@identity.invalid`, name, now, now, issuer, subject],
      ),
      this.stmt(
        "INSERT INTO nexus_blog_identities(issuer,subject,user_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=?) AND NOT EXISTS(SELECT 1 FROM nexus_blog_identities WHERE issuer=? AND subject=?)",
        [issuer, subject, id, id, issuer, subject],
      ),
      this.stmt(
        "SELECT user_id FROM nexus_blog_identities WHERE issuer=? AND subject=?",
        [issuer, subject],
      ),
    ]);
    return String(results[2]!.results[0]!.user_id);
  }
  async legacySlug(id: string) {
    return (
      (
        await this.stmt(
          "SELECT e.slug FROM nexus_legacy_map m JOIN nexus_events e ON e.id=m.event_id WHERE m.legacy_id=? AND e.status='published'",
          [id],
        ).first<{ slug: string }>()
      )?.slug ?? null
    );
  }
}
