"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KINDS,
  KIND_LABELS,
  MODE_LABELS,
  MILESTONE_LABELS,
  type EventInput,
} from "@/modules/events/schema";
const empty: EventInput = {
  schemaVersion: 1,
  slug: "",
  title: "",
  officialName: "",
  series: "",
  edition: "2026",
  kind: "hackathon",
  mode: "online",
  region: "unknown",
  entry: "unknown",
  mainlandEligibility: "unknown",
  fee: "unknown",
  location: "线上",
  organizer: "",
  summary: "",
  deliverables: "",
  registrationSteps: [],
  submissionChecklist: [],
  eligibility: "",
  eligibilityStatus: "unknown",
  team: "",
  costs: "待官方明确",
  rules: "",
  officialUrl: "",
  registration: "unknown",
  registrationSignal: "unknown",
  tags: [],
  sources: [
    {
      id: "rules",
      role: "official",
      title: "官方规则",
      url: "",
      locator: "赛事规则 / 参赛资格 / 赛程",
    },
  ],
  milestones: [],
  evidence: {
    organizer: "rules",
    eligibility: "rules",
    deliverables: "rules",
    rules: "rules",
    officialUrl: "rules",
    registration: "rules",
    registrationSteps: "rules",
    submissionChecklist: "rules",
    region: "rules",
    entry: "rules",
    mainlandEligibility: "rules",
    fee: "rules",
  },
  cancellation: null,
};
const fields = [
  ["title", "赛事名称"],
  ["slug", "稳定链接 slug（创建后固定）"],
  ["officialName", "官方英文名称（可选）"],
  ["edition", "届次"],
  ["series", "赛事系列（可选）"],
  ["organizer", "主办方"],
  ["location", "地点或线上说明"],
  ["officialUrl", "官方报名 / 规则链接"],
  ["team", "组队要求"],
] as const;
const longFields = [
  ["summary", "一句话摘要"],
  ["eligibility", "参赛资格（明确地区、年龄、学籍与未知项）"],
  ["deliverables", "技术任务与提交材料"],
  ["costs", "费用、设备与算力投入"],
  ["rules", "代码复用、AI 使用及作品权利等关键规则"],
] as const;
export function EventEditor({
  initial,
  id: initialId,
  initialVersion = 0,
  initialVerified = false,
}: {
  initial?: EventInput;
  id?: string;
  initialVersion?: number;
  initialVerified?: boolean;
}) {
  const [data, setData] = useState<EventInput>({
      ...empty,
      ...initial,
      registrationSteps: initial?.registrationSteps ?? [],
      submissionChecklist: initial?.submissionChecklist ?? [],
      evidence: { ...empty.evidence, ...initial?.evidence },
    }),
    [id, setId] = useState(initialId),
    [version, setVersion] = useState(initialVersion),
    [verified, setVerified] = useState(initialVerified),
    [dirty, setDirty] = useState(!initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [ack, setAck] = useState(false);
  const router = useRouter();
  function set<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setAck(false);
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    const payload = {
      ...data,
      registrationSteps: data.registrationSteps.filter((x) => x.trim()),
      submissionChecklist: data.submissionChecklist.filter((x) => x.trim()),
    };
    try {
      const r = await fetch(
        id ? `/api/admin/events/${id}` : "/api/admin/events",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(id ? { version, payload } : payload),
        },
      );
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setId(b.id);
      setVersion(b.version);
      setVerified(false);
      setDirty(false);
      setAck(false);
      setMessage(`草稿 v${b.version} 已保存，尚未更新公开版本。`);
      if (!id) router.replace(`/admin/events/${b.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setBusy(false);
    }
  }
  async function act(action: "verify" | "publish" | "withdraw" | "flag") {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/events/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, action, acknowledged: ack }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      if (action === "verify") setVerified(true);
      if (action === "withdraw") {
        setVersion((v) => v + 1);
        setVerified(false);
      }
      setMessage(
        {
          verify: "此版本核验已记录；尚未发布。",
          publish: "此版本已公开。",
          withdraw: "活动已下架，收藏保留占位。",
          flag: "已标记待复核，退出默认推荐。",
        }[action],
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="notice">
        编辑先保存为新草稿，已公开内容不会随保存直接改变。核验前请逐项打开官方来源核对；日期不明确时保留原文，不要猜测时刻。
      </div>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2>活动内容 {version ? `· 草稿 v${version}` : ""}</h2>
        <div className="form-grid">
          {fields.map(([key, label]) => (
            <label key={key} className="field">
              {label}
              <input
                value={data[key]}
                disabled={key === "slug" && !!id}
                onChange={(e) => set(key, e.target.value)}
                required={!["officialName", "series"].includes(key)}
              />
            </label>
          ))}
          {(
            [
              ["registrationSteps", "报名流程（每行一步）"],
              ["submissionChecklist", "提交清单（每行一项）"],
            ] as const
          ).map(([key, label]) => (
            <label className="field full" key={key}>
              {label}
              <textarea
                value={data[key]?.join("\n") ?? ""}
                onChange={(e) => set(key, e.target.value.split("\n"))}
              />
            </label>
          ))}
          <label className="field">
            赛事类型
            <select
              value={data.kind}
              onChange={(e) =>
                set("kind", e.target.value as EventInput["kind"])
              }
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            参与方式
            <select
              value={data.mode}
              onChange={(e) =>
                set("mode", e.target.value as EventInput["mode"])
              }
            >
              {Object.entries(MODE_LABELS).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              [
                "region",
                "活动地区",
                [
                  ["unknown", "待确认"],
                  ["domestic", "国内"],
                  ["international", "国际 / 国外"],
                ],
              ],
              [
                "entry",
                "参与门槛",
                [
                  ["unknown", "待确认"],
                  ["direct", "直接报名参赛"],
                  ["application", "申请后录取"],
                  ["qualification", "需预选或邀请"],
                ],
              ],
              [
                "mainlandEligibility",
                "中国大陆学生资格",
                [
                  ["unknown", "待确认"],
                  ["eligible", "规则允许，仍需满足个人条件"],
                  ["ineligible", "规则明确不允许"],
                ],
              ],
              [
                "fee",
                "报名费",
                [
                  ["unknown", "待确认"],
                  ["free", "免费"],
                  ["paid", "收费"],
                ],
              ],
            ] as const
          ).map(([key, label, options]) => (
            <label className="field" key={key}>
              {label}
              <select
                value={data[key]}
                onChange={(e) =>
                  set(key, e.target.value as EventInput[typeof key])
                }
              >
                {options.map(([v, text]) => (
                  <option key={v} value={v}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="field">
            资格信息
            <select
              value={data.eligibilityStatus}
              onChange={(e) =>
                set(
                  "eligibilityStatus",
                  e.target.value as EventInput["eligibilityStatus"],
                )
              }
            >
              <option value="unknown">部分待明确</option>
              <option value="confirmed">官方已明确</option>
              <option value="restricted">有明确限制</option>
            </select>
          </label>
          <label className="field">
            报名规则
            <select
              value={data.registration}
              onChange={(e) =>
                set(
                  "registration",
                  e.target.value as EventInput["registration"],
                )
              }
            >
              <option value="unknown">待确认</option>
              <option value="window">明确时间窗口</option>
              <option value="rolling">官方明确滚动报名</option>
            </select>
          </label>
          <label className="field">
            核验时官方报名状态
            <select
              value={data.registrationSignal}
              onChange={(e) =>
                set(
                  "registrationSignal",
                  e.target.value as EventInput["registrationSignal"],
                )
              }
            >
              <option value="unknown">未能确认</option>
              <option value="open">官方明确开放</option>
              <option value="closed">官方明确关闭</option>
            </select>
          </label>
          <label className="field full">
            技术标签（逗号分隔，最多 10 个）
            <input
              value={data.tags.join(", ")}
              onChange={(e) =>
                set(
                  "tags",
                  e.target.value
                    .split(/[,，]/)
                    .map((t) => t.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          {longFields.map(([key, label]) => (
            <label className="field full" key={key}>
              {label}
              <textarea
                value={data[key]}
                onChange={(e) => set(key, e.target.value)}
                required
              />
            </label>
          ))}
          <label className="field full">
            官方取消 / 变更说明（没有则留空）
            <input
              value={data.cancellation ?? ""}
              onChange={(e) => set("cancellation", e.target.value || null)}
            />
          </label>
        </div>
        <section className="form-section">
          <h2>来源证据</h2>
          {data.sources.map((s, i) => (
            <div
              className="panel form-grid"
              style={{ marginBottom: 12 }}
              key={i}
            >
              {(["id", "title", "url", "locator"] as const).map((key) => (
                <label className="field" key={key}>
                  {
                    {
                      id: "来源 ID",
                      title: "来源标题",
                      url: "原始链接",
                      locator: "定位：章节 / 段落",
                    }[key]
                  }
                  <input
                    value={s[key]}
                    onChange={(e) =>
                      set(
                        "sources",
                        data.sources.map((x, j) =>
                          j === i ? { ...x, [key]: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <label className="field">
                来源角色
                <select
                  value={s.role}
                  onChange={(e) =>
                    set(
                      "sources",
                      data.sources.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              role: e.target.value as "official" | "discovery",
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="official">官方依据</option>
                  <option value="discovery">发现线索</option>
                </select>
              </label>
              <button
                className="btn"
                type="button"
                onClick={() =>
                  set(
                    "sources",
                    data.sources.filter((_, j) => j !== i),
                  )
                }
              >
                移除此来源
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() =>
              set("sources", [
                ...data.sources,
                {
                  id: `source-${data.sources.length + 1}`,
                  title: "",
                  url: "",
                  locator: "",
                  role: "official",
                },
              ])
            }
          >
            ＋ 添加来源
          </button>
          <div className="form-grid" style={{ marginTop: 16 }}>
            {Object.entries({
              organizer: "主办方依据",
              eligibility: "资格依据",
              deliverables: "交付物依据",
              rules: "规则依据",
              officialUrl: "报名入口依据",
              registration: "报名状态依据",
            }).map(([key, label]) => (
              <label className="field" key={key}>
                {label}
                <select
                  value={data.evidence[key] ?? ""}
                  onChange={(e) =>
                    set("evidence", { ...data.evidence, [key]: e.target.value })
                  }
                >
                  <option value="">请选择官方来源</option>
                  {data.sources
                    .filter((x) => x.role === "official")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title || s.id}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
        </section>
        <section className="form-section">
          <h2>行动时间线</h2>
          {data.milestones.map((m, i) => (
            <div
              key={i}
              className="panel form-grid"
              style={{ marginBottom: 12 }}
            >
              <label className="field">
                类型
                <select
                  value={m.kind}
                  onChange={(e) =>
                    set(
                      "milestones",
                      data.milestones.map((x, j) =>
                        j === i
                          ? { ...x, kind: e.target.value as typeof m.kind }
                          : x,
                      ),
                    )
                  }
                >
                  {Object.entries(MILESTONE_LABELS).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                精度
                <select
                  value={m.precision}
                  onChange={(e) =>
                    set(
                      "milestones",
                      data.milestones.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              precision: e.target.value as typeof m.precision,
                              start: null,
                              end: null,
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="unknown">待公布</option>
                  <option value="month">仅月份</option>
                  <option value="date">仅日期</option>
                  <option value="instant">精确时刻（需偏移）</option>
                </select>
              </label>
              {(["label", "start", "end", "timezone", "raw"] as const).map(
                (key) => (
                  <label className="field" key={key}>
                    {
                      {
                        label: "节点名称",
                        start: "开始 / 截止值",
                        end: "区间结束（可空）",
                        timezone: "源时区",
                        raw: "官方原始表述",
                      }[key]
                    }
                    <input
                      value={m[key] ?? ""}
                      disabled={
                        ["start", "end"].includes(key) &&
                        m.precision === "unknown"
                      }
                      placeholder={
                        key === "start"
                          ? "2026-11-01 或 2026-11-01T12:00:00+08:00"
                          : ""
                      }
                      onChange={(e) =>
                        set(
                          "milestones",
                          data.milestones.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  [key]:
                                    e.target.value ||
                                    (["start", "end"].includes(key)
                                      ? null
                                      : ""),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                ),
              )}
              <label className="field">
                时间依据
                <select
                  value={m.sourceId}
                  onChange={(e) =>
                    set(
                      "milestones",
                      data.milestones.map((x, j) =>
                        j === i ? { ...x, sourceId: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {data.sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || s.id}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  set(
                    "milestones",
                    data.milestones.filter((_, j) => j !== i),
                  )
                }
              >
                移除此节点
              </button>
            </div>
          ))}
          <button
            className="btn"
            type="button"
            onClick={() =>
              set("milestones", [
                ...data.milestones,
                {
                  id: `m-${Date.now()}`,
                  kind: "submission",
                  label: "作品提交截止",
                  precision: "unknown",
                  start: null,
                  end: null,
                  timezone: "Asia/Shanghai",
                  raw: "待官方公布",
                  sourceId: data.sources[0]?.id ?? "rules",
                },
              ])
            }
          >
            ＋ 添加时间节点
          </button>
        </section>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success-text" role="status">
            {message}
          </p>
        )}
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? "处理中…" : "保存草稿"}
        </button>
      </form>
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>核验与发布</h2>
        <p className="small muted">
          请先保存所有修改。核验不会自动发布；发布只切换当前已核验版本。
        </p>
        <label className="small">
          <input
            type="checkbox"
            checked={ack}
            disabled={dirty}
            onChange={(e) => setAck(e.target.checked)}
          />{" "}
          我已逐项核对官方规则、参赛资格、来源定位与时间精度。
        </label>
        <div className="actions">
          <button
            className="btn"
            disabled={!id || dirty || busy || !ack}
            onClick={() => void act("verify")}
          >
            记录人工核验
          </button>
          <button
            className="btn primary"
            disabled={!id || dirty || busy || !verified}
            onClick={() => void act("publish")}
          >
            发布此版本
          </button>
          <button
            className="btn"
            disabled={!id || dirty || busy}
            onClick={() => void act("flag")}
          >
            标记待复核
          </button>
          <button
            className="btn"
            disabled={!id || dirty || busy}
            onClick={() => void act("withdraw")}
          >
            下架活动
          </button>
        </div>
        {id && (
          <p className="small">
            <a
              href={`/events/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              查看公开页面 ↗
            </a>
            （尚未发布时不可见）
          </p>
        )}
      </section>
    </>
  );
}
