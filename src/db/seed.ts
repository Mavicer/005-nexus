/**
 * 种子数据脚本 — 验证 P1 竞赛链路
 *
 * 录入 3-5 个真实全国通用竞赛，每个填满全部字段 +
 * 至少 2 个来源（官方 + 排行榜/高校通知）+ 轮次 + 1 条学生经验。
 *
 * 用法：npm run db:seed（需先 npm run db:push 建表）
 *
 * 注意：MVP 录入流程 = draft → pending → published（护栏3，发布前人工过审）
 *      种子数据直接置为 published 以便验收搜索/详情页。
 */
import { eq, sql } from "drizzle-orm";

import { db, pool } from "@/db/client";
import {
  infoItems,
  infoSources,
  competitions,
  competitionRounds,
  experiences,
} from "@/db/schema";
import { SOURCE_AUTHORITY_WEIGHT, type SourceType } from "@/lib/source-weights";
import { computeCredibilityScore } from "@/lib/credibility";

interface SeedCompetition {
  title: string;
  aliases: string[];
  summary: string;
  organizer: string;
  level: "school" | "provincial" | "national" | "international";
  recognition: "official_A" | "leaderboard_listed" | "normal";
  frequency: "annual" | "biennial" | "irregular" | "once";
  validYear: number;
  suitableGrades: string[];
  suitableMajors: string[];
  prereq: string;
  teamOrSolo: "team" | "solo" | "both";
  teamSize: string;
  difficulty: number;
  effortEstimate: string;
  valueTags: string[];
  helps: string[];
  officialUrl: string;
  sources: { sourceType: SourceType; url: string; title: string; isPrimary: boolean }[];
  rounds: { name: string; sortOrder: number }[];
  experience: { content: string; author: string; sourceUrl?: string };
  signUpEndISO: string;
}

const SEED: SeedCompetition[] = [
  {
    title: "全国大学生数学建模竞赛",
    aliases: ["CUMCM", "数模", "数学建模"],
    summary: "面向全国的本科生数学建模竞赛，三人组队，三天内完成建模论文。",
    organizer: "中国工业与应用数学学会",
    level: "national",
    recognition: "official_A",
    frequency: "annual",
    validYear: 2026,
    suitableGrades: ["大二", "大三"],
    suitableMajors: ["理工", "经管"],
    prereq: "高等数学、线性代数、概率统计基础；编程能力（MATLAB/Python）",
    teamOrSolo: "team",
    teamSize: "3",
    difficulty: 4,
    effortEstimate: "约 80 小时（赛前 + 比赛三天）",
    valueTags: ["保研加分", "综测加分"],
    helps: ["保研", "考研", "就业"],
    officialUrl: "http://www.mcm.edu.cn/",
    signUpEndISO: "2026-09-09T23:59:59+08:00",
    sources: [
      { sourceType: "official_doc", url: "http://www.mcm.edu.cn/html_cn/node/1", title: "全国大学生数学建模竞赛章程", isPrimary: true },
      { sourceType: "inst_notice", url: "https://example.edu.cn/jwc/notice/cumcm", title: "某高校教务处：组织报名通知", isPrimary: false },
    ],
    rounds: [
      { name: "国赛（初赛）", sortOrder: 1 },
      { name: "复赛", sortOrder: 2 },
    ],
    experience: {
      content: "组队是关键，建议一数学好、一编程强、一写论文。三天基本不睡，但拿国奖对保研很有用。",
      author: "匿名学长",
      sourceUrl: "https://example.com/exp/cumcm",
    },
  },
  {
    title: "ACM-ICPC 国际大学生程序设计竞赛",
    aliases: ["ICPC", "ACM"],
    summary: "国际大学生程序设计竞赛，三人组队，限时编程解题，算法竞赛含金量高。",
    organizer: "国际计算机学会（ACM）",
    level: "international",
    recognition: "official_A",
    frequency: "annual",
    validYear: 2026,
    suitableGrades: ["大一", "大二", "大三"],
    suitableMajors: ["理工"],
    prereq: "数据结构、算法基础；熟练 C++/Java/Python",
    teamOrSolo: "team",
    teamSize: "3",
    difficulty: 5,
    effortEstimate: "约 200 小时以上（长期训练）",
    valueTags: ["保研加分", "名企认可"],
    helps: ["保研", "就业", "出国"],
    officialUrl: "https://icpc.global/",
    signUpEndISO: "2026-10-15T23:59:59+08:00",
    sources: [
      { sourceType: "official_site", url: "https://icpc.global/", title: "ICPC 官网", isPrimary: true },
      { sourceType: "authority_list", url: "https://example.com/rank/icpc", title: "竞赛排行榜收录", isPrimary: false },
    ],
    rounds: [
      { name: "校赛", sortOrder: 1 },
      { name: "省赛", sortOrder: 2 },
      { name: "区域赛", sortOrder: 3 },
      { name: "全球总决赛", sortOrder: 4 },
    ],
    experience: {
      content: "刷题量决定一切，Codeforces 持续训练。区域赛拿金可直接进大厂面试。",
      author: "算法选手",
    },
  },
  {
    title: "挑战杯全国大学生课外学术科技作品竞赛",
    aliases: ["挑战杯", "大挑"],
    summary: "面向全国大学生的课外学术科技作品竞赛，两年一届，含金量高，保研加分明显。",
    organizer: "共青团中央 / 中国科协 / 教育部",
    level: "national",
    recognition: "official_A",
    frequency: "biennial",
    validYear: 2026,
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["理工", "经管", "人文"],
    prereq: "有课外科研项目或作品；导师指导",
    teamOrSolo: "team",
    teamSize: "1-8",
    difficulty: 4,
    effortEstimate: "约 150 小时（含项目打磨）",
    valueTags: ["保研加分", "综测加分"],
    helps: ["保研", "考研", "就业"],
    officialUrl: "https://www.tiaozhanbei.org/",
    signUpEndISO: "2026-06-30T23:59:59+08:00",
    sources: [
      { sourceType: "official_doc", url: "https://www.tiaozhanbei.org/notice", title: "挑战杯章程", isPrimary: true },
      { sourceType: "inst_notice", url: "https://example.edu.cn/tw/notice/tiaozhanbei", title: "校团委组织通知", isPrimary: false },
    ],
    rounds: [
      { name: "校赛", sortOrder: 1 },
      { name: "省赛", sortOrder: 2 },
      { name: "国赛", sortOrder: 3 },
    ],
    experience: {
      content: "作品要早准备，最好有导师背书。省赛进国赛对保研加分很实在。",
      author: "大挑国奖得主",
    },
  },
];

async function seed() {
  console.log("[seed] 开始录入种子数据...");
  for (const c of SEED) {
    // 1. info_items（search_vector 由应用层在写入时计算填充）
    const searchVectorText = [c.title, ...(c.aliases ?? []), c.summary]
      .filter(Boolean)
      .join(" ");
    const [item] = await db
      .insert(infoItems)
      .values({
        category: "competition",
        title: c.title,
        aliases: c.aliases,
        summary: c.summary,
        status: "published",
        applicableScopeType: "national",
        expireAt: new Date(c.signUpEndISO),
        lastVerifiedAt: new Date(),
        lastUpdatedAt: new Date(),
        // search_vector: 应用层用 to_tsvector('simple', ...) 填充
        searchVector: sql`to_tsvector('simple', ${searchVectorText})`,
      })
      .returning({ id: infoItems.id });

    if (!item) throw new Error(`插入 info_item 失败: ${c.title}`);

    // 2. info_sources（同时收集用于可信度计算）
    const sourceInfos = [];
    for (const s of c.sources) {
      const authorityWeight = SOURCE_AUTHORITY_WEIGHT[s.sourceType];
      await db.insert(infoSources).values({
        infoItemId: item.id,
        sourceType: s.sourceType,
        authorityWeight: authorityWeight.toString(),
        url: s.url,
        title: s.title,
        isPrimary: s.isPrimary,
        archivedAt: new Date(),
      });
      sourceInfos.push({ sourceType: s.sourceType, authorityWeight });
    }

    // 3. credibility_score（服务层计算）
    const score = computeCredibilityScore({
      sources: sourceInfos,
      lastVerifiedAt: new Date(),
      expireAt: new Date(c.signUpEndISO),
    });
    await db
      .update(infoItems)
      .set({ credibilityScore: score.toFixed(2) })
      .where(eq(infoItems.id, item.id));

    // 4. competitions 明细
    await db.insert(competitions).values({
      infoItemId: item.id,
      organizer: c.organizer,
      level: c.level,
      recognition: c.recognition,
      signUpEnd: new Date(c.signUpEndISO),
      frequency: c.frequency,
      validYear: c.validYear,
      suitableGrades: c.suitableGrades,
      suitableMajors: c.suitableMajors,
      prereq: c.prereq,
      teamOrSolo: c.teamOrSolo,
      teamSize: c.teamSize,
      difficulty: c.difficulty,
      effortEstimate: c.effortEstimate,
      valueTags: c.valueTags,
      helps: c.helps,
      officialUrl: c.officialUrl,
    });

    // 5. competition_rounds
    for (const r of c.rounds) {
      await db.insert(competitionRounds).values({
        competitionId: item.id,
        name: r.name,
        sortOrder: r.sortOrder,
      });
    }

    // 6. experiences（学生经验，与官方分层）
    await db.insert(experiences).values({
      infoItemId: item.id,
      content: c.experience.content,
      author: c.experience.author,
      sourceUrl: c.experience.sourceUrl,
    });

    console.log(`[seed] ✓ ${c.title} (credibility=${score.toFixed(2)})`);
  }
  console.log("[seed] 完成");
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("[seed] 失败:", err);
    void pool.end();
    process.exit(1);
  });
