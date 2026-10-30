import { describe, it, expect } from "vitest";
import { eventSchema, listSchema } from "../schema";
import { registrationState, overlapsMonth } from "../time";
import { buildCalendar } from "../calendar";
import { fixture } from "./fixture";

describe("evidence and input boundaries", () => {
  it("requires official evidence for actionable registration and submission checklists", () => {
    const e = fixture();
    e.registrationSteps = ["在官方系统登记队伍信息"];
    expect(eventSchema.safeParse(e).success).toBe(false);
    e.evidence.registrationSteps = "rules";
    e.submissionChecklist = ["提交可运行代码和使用说明"];
    expect(eventSchema.safeParse(e).success).toBe(false);
    e.evidence.submissionChecklist = "rules";
    expect(eventSchema.safeParse(e).success).toBe(true);
    expect(
      listSchema.parse({ region: "domestic", entry: "direct", fee: "free" }),
    ).toMatchObject({ region: "domestic", entry: "direct", fee: "free" });
  });
  it("rejects missing official provenance and duplicate local IDs", () => {
    const e = fixture();
    e.evidence.eligibility = "missing";
    expect(eventSchema.safeParse(e).success).toBe(false);
    e.evidence.eligibility = "rules";
    e.sources.push({ ...e.sources[0]! });
    expect(eventSchema.safeParse(e).success).toBe(false);
  });
  it("rejects invented precise time and nonfinite/fractional pagination", () => {
    const e = fixture();
    e.milestones[0]!.start = "2026-10-01T00:00:00";
    expect(eventSchema.safeParse(e).success).toBe(false);
    for (const page of [1.2, Infinity, -1])
      expect(listSchema.safeParse({ page }).success).toBe(false);
  });
  it("rejects unsafe links and reversed intervals", () => {
    const e = fixture();
    e.officialUrl = "javascript:alert(1)";
    expect(eventSchema.safeParse(e).success).toBe(false);
    e.officialUrl = "https://devpost.com/hackathons";
    e.milestones[0]!.end = "2026-09-01T00:00:00+08:00";
    expect(eventSchema.safeParse(e).success).toBe(false);
  });
});
describe("separate registration and submission", () => {
  it("closes at the boundary even while submission remains open", () => {
    const e = fixture();
    expect(registrationState(e, new Date("2026-10-31T15:59:59Z"))).toBe("open");
    expect(registrationState(e, new Date("2026-10-31T16:00:00Z"))).toBe(
      "closed",
    );
  });
  it("does not infer registration from the event date", () => {
    const e = fixture();
    e.registration = "unknown";
    e.milestones = e.milestones.filter((x) => x.kind === "submission");
    expect(registrationState(e)).toBe("unknown");
  });
  it("requires evidence for observed open registration without inventing a deadline", () => {
    const e = fixture();
    e.registration = "unknown";
    e.registrationSignal = "open";
    e.milestones = [];
    delete e.evidence.registration;
    expect(eventSchema.safeParse(e).success).toBe(false);
    e.evidence.registration = "rules";
    expect(eventSchema.safeParse(e).success).toBe(true);
    expect(registrationState(e, new Date("2026-10-20"))).toBe("open");
  });
  it("expires a date-only registration after its stated local day", () => {
    const e = fixture();
    e.registrationSignal = "open";
    const deadline = e.milestones.find((m) => m.kind === "registration_close")!;
    deadline.precision = "date";
    deadline.start = "2026-10-31";
    expect(registrationState(e, new Date("2026-10-31T15:59:59Z"))).toBe("open");
    expect(registrationState(e, new Date("2026-10-31T16:00:00Z"))).toBe(
      "closed",
    );
  });
  it("honors the explicitly observed closure", () => {
    const e = fixture();
    e.registrationSignal = "closed";
    expect(registrationState(e, new Date("2026-10-20"))).toBe("closed");
  });
});
describe("calendar correctness", () => {
  it("retains cross-month and cross-year intervals", () => {
    const m = {
      ...fixture().milestones[0]!,
      precision: "date" as const,
      start: "2026-12-29",
      end: "2027-01-03",
    };
    expect(overlapsMonth(m, "2027-01")).toBe(true);
    expect(overlapsMonth(m, "2027-02")).toBe(false);
  });
  it("exports a deadline as a point, stable UID, no fabricated hour", () => {
    const e = fixture();
    const s = buildCalendar("id", e, 2, "closes", new Date("2026-10-30"));
    expect(s).toContain("UID:id-closes@nexus");
    expect(s).toContain("DTSTART:20261031T160000Z");
    expect(s).not.toContain("DTEND");
    expect(s).toContain("SEQUENCE:2");
  });
  it("uses exclusive all-day end and UTF8 octet folding", () => {
    const e = fixture();
    e.title = "计算机开发实践".repeat(15);
    e.milestones = [
      {
        ...e.milestones[0]!,
        precision: "date",
        start: "2026-12-29",
        end: "2027-01-03",
      },
    ];
    const s = buildCalendar("id", e, 1);
    expect(s).toContain("DTEND;VALUE=DATE:20270104");
    for (const line of s.split("\r\n"))
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
  it("does not export a month as a specific date", () => {
    const e = fixture();
    e.milestones = [
      { ...e.milestones[0]!, precision: "month", start: "2026-12" },
    ];
    expect(() => buildCalendar("id", e, 1)).toThrow();
  });
});
