import { and, eq, or, sql } from "drizzle-orm";
import { events } from "@/db/schema";

const topics: Record<string, string> = {
  机器人: "robotics_hardware",
  硬件: "robotics_hardware",
  嵌入式: "robotics_hardware",
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
export const searchMode = (term: string) => modes[term];
// Limit typo tolerance to known topic names; short queries must remain exact.
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1]! + 1,
        row[j]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length]!;
}
export function searchTopic(term: string) {
  const word = term.replace(/(?:比赛|竞赛|赛事)$/u, "");
  const exact = topics[term] ?? topics[word];
  if (exact) return exact;
  if (word.length < 4 || word.length > 32) return undefined;
  const matches = new Set(
    Object.entries(topics)
      .filter(
        ([name]) =>
          Math.abs(name.length - word.length) <= 1 && distance(word, name) <= 1,
      )
      .map(([, topic]) => topic),
  );
  return matches.size === 1 ? [...matches][0] : undefined;
}
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
        const topic = searchTopic(term);
        return or(
          sql`${content} ILIKE ${"%" + escapeLike(term) + "%"}`,
          topic ? eq(events.kind, topic) : undefined,
        )!;
      }),
    ) ?? sql`true`
  );
}
