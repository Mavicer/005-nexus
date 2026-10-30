import { z } from "zod";
import { DateTime, IANAZone } from "luxon";

export const KINDS = [
  "hackathon",
  "developer_challenge",
  "ai_data",
  "math_modeling",
  "ctf",
  "algorithm",
  "robotics_hardware",
] as const;
export const KIND_LABELS: Record<string, string> = {
  hackathon: "黑客松",
  developer_challenge: "开发挑战",
  ai_data: "AI / 数据",
  math_modeling: "数学建模",
  ctf: "CTF",
  algorithm: "算法竞赛",
  robotics_hardware: "机器人 / 硬件",
};
export const MODE_LABELS: Record<string, string> = {
  online: "线上",
  onsite: "线下",
  hybrid: "混合",
};
export const ENTRY_LABELS: Record<string, string> = {
  direct: "直接报名",
  application: "报名后审核",
  qualification: "需预选资格",
  unknown: "报名方式待确认",
};
export const FEE_LABELS: Record<string, string> = {
  free: "免费",
  paid: "收费",
  unknown: "费用待确认",
};
export const REGION_LABELS: Record<string, string> = {
  domestic: "国内（含港澳台）",
  international: "国际 / 国外",
  unknown: "地区待确认",
};
export const MILESTONE_LABELS: Record<string, string> = {
  registration_open: "报名开启",
  registration_close: "报名截止",
  event: "活动时间",
  submission: "作品提交截止",
  results: "结果公布",
};
export function canonicalUrl(raw: string) {
  const u = new URL(raw);
  u.hash = "";
  for (const key of [...u.searchParams.keys()])
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key))
      u.searchParams.delete(key);
  u.searchParams.sort();
  return u.toString().replace(/\/$/, "");
}
export const httpUrl = z
  .string()
  .max(2000)
  .url()
  .refine((s) => {
    const u = new URL(s);
    return (
      ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !/(^|\.)(example\.(com|org|net)|example\.edu\.cn)$/i.test(u.hostname)
    );
  }, "请提供真实的 HTTP(S) 官方链接");
const localId = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const sourceSchema = z.object({
  id: localId,
  role: z.enum(["official", "discovery"]),
  title: z.string().trim().min(2).max(200),
  url: httpUrl,
  locator: z.string().trim().min(2).max(400),
  externalId: z.string().max(200).optional(),
});
const milestoneSchema = z
  .object({
    id: localId,
    kind: z.enum([
      "registration_open",
      "registration_close",
      "event",
      "submission",
      "results",
    ]),
    label: z.string().trim().min(1).max(100),
    precision: z.enum(["instant", "date", "month", "unknown"]),
    start: z.string().max(100).nullable(),
    end: z.string().max(100).nullable().default(null),
    timezone: z
      .string()
      .refine(
        (s) => IANAZone.isValidZone(s),
        "时区须为 IANA 名称，如 Asia/Shanghai",
      ),
    raw: z.string().trim().min(1).max(400),
    sourceId: localId,
  })
  .superRefine((m, ctx) => {
    const valid = (s: string) =>
      m.precision === "instant"
        ? /(?:Z|[+-]\d{2}:\d{2})$/.test(s) &&
          DateTime.fromISO(s, { setZone: true }).isValid
        : m.precision === "date"
          ? /^\d{4}-\d{2}-\d{2}$/.test(s) && DateTime.fromISO(s).isValid
          : /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
    if (m.precision === "unknown") {
      if (m.start || m.end)
        ctx.addIssue({
          code: "custom",
          message: "待定时间不得填写猜测日期",
          path: ["start"],
        });
    } else if (!m.start || !valid(m.start) || (m.end && !valid(m.end))) {
      ctx.addIssue({
        code: "custom",
        message: "日期或精度格式不正确；精确时刻必须包含 UTC 偏移",
        path: ["start"],
      });
    } else if (
      m.end &&
      (m.precision === "instant"
        ? DateTime.fromISO(m.end).toMillis() <=
          DateTime.fromISO(m.start).toMillis()
        : m.end < m.start)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "结束时间必须晚于开始时间",
        path: ["end"],
      });
    }
  });
export const eventSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    title: z.string().trim().min(3).max(180),
    officialName: z.string().trim().max(180).default(""),
    series: z.string().max(100).default(""),
    edition: z.string().trim().min(1).max(80),
    kind: z.enum(KINDS),
    mode: z.enum(["online", "onsite", "hybrid"]),
    region: z.enum(["domestic", "international", "unknown"]).default("unknown"),
    entry: z
      .enum(["direct", "application", "qualification", "unknown"])
      .default("unknown"),
    mainlandEligibility: z
      .enum(["eligible", "ineligible", "unknown"])
      .default("unknown"),
    fee: z.enum(["free", "paid", "unknown"]).default("unknown"),
    location: z.string().trim().min(1).max(200),
    organizer: z.string().trim().min(2).max(200),
    summary: z.string().trim().min(10).max(500),
    deliverables: z.string().trim().min(5).max(2000),
    registrationSteps: z
      .array(z.string().trim().min(3).max(350))
      .max(8)
      .default([]),
    submissionChecklist: z
      .array(z.string().trim().min(3).max(350))
      .max(10)
      .default([]),
    eligibility: z.string().trim().min(5).max(2000),
    eligibilityStatus: z.enum(["confirmed", "restricted", "unknown"]),
    team: z.string().trim().min(1).max(200),
    costs: z.string().trim().min(1).max(400),
    rules: z.string().trim().min(5).max(3000),
    officialUrl: httpUrl,
    registration: z.enum(["window", "rolling", "unknown"]),
    registrationSignal: z
      .enum(["open", "closed", "unknown"])
      .default("unknown"),
    tags: z.array(z.string().trim().min(1).max(30)).max(10),
    sources: z.array(sourceSchema).min(1).max(15),
    milestones: z.array(milestoneSchema).max(30),
    evidence: z.record(z.string(), localId),
    cancellation: z.string().max(500).nullable().default(null),
  })
  .superRefine((e, ctx) => {
    const ids = new Set(e.sources.map((s) => s.id));
    if (
      ids.size !== e.sources.length ||
      new Set(e.milestones.map((m) => m.id)).size !== e.milestones.length
    )
      ctx.addIssue({ code: "custom", message: "来源和里程碑 ID 必须各自唯一" });
    if (!e.sources.some((s) => s.role === "official"))
      ctx.addIssue({
        code: "custom",
        message: "至少需要一份官方依据",
        path: ["sources"],
      });
    for (const key of [
      "organizer",
      "eligibility",
      "deliverables",
      "rules",
      "officialUrl",
    ]) {
      if (
        !e.sources.some(
          (s) => s.id === e.evidence[key] && s.role === "official",
        )
      )
        ctx.addIssue({
          code: "custom",
          message: `${key} 需要官方来源证据`,
          path: ["evidence", key],
        });
    }
    if (
      e.registrationSignal !== "unknown" &&
      !e.sources.some(
        (s) => s.id === e.evidence.registration && s.role === "official",
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "官方报名状态需要来源依据",
        path: ["evidence", "registration"],
      });
    for (const key of [
      "region",
      "entry",
      "mainlandEligibility",
      "fee",
    ] as const) {
      if (
        e[key] !== "unknown" &&
        !e.sources.some(
          (s) => s.id === e.evidence[key] && s.role === "official",
        )
      )
        ctx.addIssue({
          code: "custom",
          message: `${key} 需要官方依据`,
          path: ["evidence", key],
        });
    }
    for (const key of ["registrationSteps", "submissionChecklist"] as const)
      if (
        e[key].length &&
        !e.sources.some(
          (s) => s.id === e.evidence[key] && s.role === "official",
        )
      )
        ctx.addIssue({
          code: "custom",
          message: `${key} 需要官方依据`,
          path: ["evidence", key],
        });
    for (const m of e.milestones)
      if (!ids.has(m.sourceId))
        ctx.addIssue({
          code: "custom",
          message: `里程碑 ${m.id} 缺少来源`,
          path: ["milestones"],
        });
    const point = (k: string) =>
      e.milestones.find((m) => m.kind === k && m.precision === "instant")
        ?.start;
    const open = point("registration_open"),
      close = point("registration_close");
    if (
      open &&
      close &&
      DateTime.fromISO(open).toMillis() >= DateTime.fromISO(close).toMillis()
    )
      ctx.addIssue({ code: "custom", message: "报名开启必须早于报名截止" });
    for (const k of ["registration_open", "registration_close", "event"])
      if (e.milestones.filter((m) => m.kind === k).length > 1)
        ctx.addIssue({
          code: "custom",
          message: `${k} 只能有一个；分赛道请拆为独立活动`,
        });
  });
export type EventInput = z.infer<typeof eventSchema>;
export type Milestone = EventInput["milestones"][number];
export const listSchema = z.object({
  q: z.string().trim().max(200).default(""),
  kind: z.enum(KINDS).optional(),
  mode: z.enum(["online", "onsite", "hybrid"]).optional(),
  state: z
    .enum(["open", "upcoming", "closed", "unknown", "all"])
    .default("all"),
  tag: z.string().max(30).optional(),
  region: z.enum(["domestic", "international", "unknown"]).optional(),
  entry: z
    .enum(["direct", "application", "qualification", "unknown"])
    .optional(),
  fee: z.enum(["free", "paid", "unknown"]).optional(),
  sort: z.enum(["recommended", "deadline", "updated"]).default("recommended"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  within: z.coerce.number().int().min(1).max(365).optional(),
});
export type ListInput = z.infer<typeof listSchema>;
