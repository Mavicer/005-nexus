// Explicit matches against this published snapshot, never inferred from a title or organiser.
// Its serial numbers are source locators, not merit ranks (see the PDF's final two notes).
export const NATIONAL_DIRECTORY = {
  year: 2024,
  title: "《2024全国普通高校大学生竞赛分析报告》竞赛目录",
  sourceUrl:
    "https://www.gzcc.edu.cn/sjjxzx/upload/files/2024/4/f6c65f10b84f1013.pdf",
  checkedAt: "2026-10-31",
} as const;
type Match = {
  status: "listed" | "series" | "scope_pending";
  name: string;
  serial: number;
};
const matches: Record<string, Match> = {
  "cumcm-2026": { status: "listed", name: "全国大学生数学建模竞赛", serial: 5 },
  "smartcar-21-2026": {
    status: "listed",
    name: "全国大学生智能汽车竞赛",
    serial: 11,
  },
  "fwwb-17-2026": {
    status: "listed",
    name: "中国大学生服务外包创新创业大赛",
    serial: 24,
  },
  "cnsoftbei-15-2026": {
    status: "listed",
    name: "中国软件杯大学生软件设计大赛",
    serial: 38,
  },
  "lanqiao-18-programming-2027": {
    status: "series",
    name: "蓝桥杯全国软件和信息技术专业人才大赛",
    serial: 27,
  },
  "computer-design-4c-2026": {
    status: "series",
    name: "中国大学生计算机设计大赛",
    serial: 25,
  },
  "huawei-ict-innovation-2027": {
    status: "series",
    name: "华为ICT大赛",
    serial: 42,
  },
  "embedded-soc-application-2026": {
    status: "series",
    name: "全国大学生嵌入式芯片与系统设计竞赛",
    serial: 43,
  },
  "embedded-fpga-2026": {
    status: "series",
    name: "全国大学生嵌入式芯片与系统设计竞赛",
    serial: 43,
  },
  "nuedc-ti-analog-2026": {
    status: "series",
    name: "全国大学生电子设计竞赛",
    serial: 6,
  },
  "nuedc-intel-embedded-ai-2026": {
    status: "series",
    name: "全国大学生电子设计竞赛",
    serial: 6,
  },
  "nuedc-renesas-frontier-2026": {
    status: "series",
    name: "全国大学生电子设计竞赛",
    serial: 6,
  },
  // Row 19 renames the event to CURC and mentions RoboMaster in the former name.
  // That alone cannot establish the scope of present-day RM sub-events.
  "robomaster-rmuc-2027": {
    status: "scope_pending",
    name: "全国大学生机器人大赛（CURC）",
    serial: 19,
  },
  "robomaster-rmul-2027": {
    status: "scope_pending",
    name: "全国大学生机器人大赛（CURC）",
    serial: 19,
  },
  "robomaster-rmua-2026": {
    status: "scope_pending",
    name: "全国大学生机器人大赛（CURC）",
    serial: 19,
  },
};
export function directoryMatch(slug: string): Match | undefined {
  return Object.hasOwn(matches, slug) ? matches[slug] : undefined;
}
export function directoryRank(slug: string): number {
  const status = directoryMatch(slug)?.status;
  return status === "listed" ? 2 : status === "series" ? 1 : 0;
}
export function directoryLabel(slug: string): string | undefined {
  const status = directoryMatch(slug)?.status;
  return status === "listed"
    ? "全国目录收录 · 2024"
    : status === "series"
      ? "所属系列收录 · 2024"
      : status === "scope_pending"
        ? "目录适用范围待确认"
        : undefined;
}
// Trusted SQL expression and fixed, validated slugs only. Used by both database adapters.
export function directoryRankSql(slugColumn: string): string {
  const clauses = Object.entries(matches)
    .filter(([, match]) => match.status !== "scope_pending")
    .map(([slug]) => {
      if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid directory slug");
      return `WHEN '${slug}' THEN ${directoryRank(slug)}`;
    });
  return `CASE ${slugColumn} ${clauses.join(" ")} ELSE 0 END`;
}
