import { and, eq, or, sql } from "drizzle-orm";
import { events } from "@/db/schema";

const topics: Record<string, string> = {
  网络安全: "ctf",
  信息安全: "ctf",
  网安: "ctf",
  夺旗: "ctf",
  夺旗赛: "ctf",
  ctf: "ctf",
  cybersecurity: "ctf",
  数学建模: "math_modeling",
  数模: "math_modeling",
  建模: "math_modeling",
  mcm: "math_modeling",
  icm: "math_modeling",
  算法: "algorithm",
  程序设计: "algorithm",
  algorithm: "algorithm",
  algorithms: "algorithm",
  黑客松: "hackathon",
  hackathon: "hackathon",
  hackathons: "hackathon",
  开发挑战: "developer_challenge",
  开发挑战赛: "developer_challenge",
  数据竞赛: "ai_data",
  数据科学: "ai_data",
};
const modes: Record<string, string> = {
  线上: "online",
  在线: "online",
  远程: "online",
  online: "online",
  线下: "onsite",
  onsite: "onsite",
  混合: "hybrid",
  hybrid: "hybrid",
};
export function searchTerms(query: string) {
  return [
    ...new Set(
      query
        .normalize("NFKC")
        .toLowerCase()
        .trim()
        .split(/\s+/u)
        .filter(Boolean),
    ),
  ];
}
export function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, "\\$&");
}
export function searchCondition(query: string) {
  const data = events.publishedData;
  const content = sql`concat_ws(' ', ${events.title}, ${data}->>'officialName', ${data}->>'series', ${data}->>'summary', ${data}->>'deliverables', ${data}->>'eligibility', ${data}->>'organizer', ${data}->>'tags')`;
  return (
    and(
      ...searchTerms(query).map((term) => {
        if (modes[term]) return eq(events.mode, modes[term]);
        const topic =
          topics[term] ?? topics[term.replace(/(?:比赛|竞赛|赛事)$/u, "")];
        return or(
          sql`${content} ILIKE ${"%" + escapeLike(term) + "%"}`,
          topic ? eq(events.kind, topic) : undefined,
        )!;
      }),
    ) ?? sql`true`
  );
}
