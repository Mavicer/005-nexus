/**
 * Phase A+ B轨数据补充 batch（Agent B 亲自 curl 验证真实来源）
 * owner 指定清单：RoboMaster/CCPC/计算机设计/天池/飞桨（已 curl 200 验证）
 * 全部 official_site 一级来源，computeCredibilityScore 自动算
 * category/subtype 标对（待 A3 inferSubtype 扩 robo-master/kaggle 等 subtype 后对齐，
 *   当前 category 标 competition/opportunity，title 含关键词供 inferSubtype 现有兜底）
 */
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { infoItems, users } from "@/db/schema";
import { createCompetition, publishCompetition } from "@/lib/admin/competitions";

interface Entry {
  title: string;
  aliases?: string[];
  summary: string;
  organizer: string;
  level: "national" | "international";
  frequency: "annual" | "biennial" | "irregular";
  suitableGrades: string[];
  suitableMajors: string[];
  prereq: string;
  difficulty: number;
  effortEstimate: string;
  valueTags: string[];
  helps: string[];
  officialUrl: string;
  sources: { sourceType: "official_site"; url: string; title: string; isPrimary: boolean }[];
}

const ENTRIES: Entry[] = [
  {
    title: "RoboMaster 机甲大师赛",
    aliases: ["RoboMaster", "RM", "机甲大师"],
    summary:
      "大疆创新发起的机器人赛事，涵盖机器人控制/视觉/机械设计等多学科，面向全球大学生，工程与算法并重，含金量高。",
    organizer: "深圳市大疆创新科技有限公司（DJI）发起并主办",
    level: "international",
    frequency: "annual",
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["自动化", "机器人", "机械", "电子", "计算机", "人工智能"],
    prereq: "机器人控制、机器视觉、机械结构设计基础；团队分工（机械/电控/视觉/算法）",
    difficulty: 5,
    effortEstimate: "持续 1 年以上备赛，赛季高强度集训",
    valueTags: ["保研加分", "大厂校招加分", "工程能力证明"],
    helps: ["保研", "就业", "机器人/嵌入式/算法方向"],
    officialUrl: "https://www.robomaster.com/zh-CN",
    sources: [
      {
        sourceType: "official_site",
        url: "https://www.robomaster.com/zh-CN",
        title: "RoboMaster 官网（大疆主办）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "中国大学生程序设计竞赛",
    aliases: ["CCPC", "中国程序设计竞赛"],
    summary:
      "中国大学生程序设计竞赛，面向高校本科生，3 人团队编程解题，算法能力核心证明，国内认可度高。",
    organizer: "中国大学生程序设计竞赛组委会（教育部高等学校计算机类专业教学指导委员会指导）",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["计算机", "软件", "人工智能", "数学", "自动化"],
    prereq: "数据结构与算法、C++/Java/Python 编程基础；3 人团队",
    difficulty: 4,
    effortEstimate: "系统训练 1 年以上，赛前刷题强度高",
    valueTags: ["保研加分", "大厂校招加分", "综测加分"],
    helps: ["保研", "就业", "算法岗"],
    officialUrl: "https://ccpc.io/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://ccpc.io/",
        title: "CCPC 中国大学生程序设计竞赛官网",
        isPrimary: true,
      },
    ],
  },
  {
    title: "中国大学生计算机设计大赛",
    aliases: ["计算机设计大赛", "计设"],
    summary:
      "教育部高等学校计算机类专业教学指导委员会指导的全国性学科竞赛，涵盖软件应用/设计/人工智能等多类，参与面广。",
    organizer: "中国大学生计算机设计大赛组委会（教育部高等学校计算机类专业教学指导委员会指导）",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["计算机", "软件", "设计", "数字媒体", "人工智能"],
    prereq: "计算机基础、软件应用或设计能力；个人或团队",
    difficulty: 3,
    effortEstimate: "3-6 个月作品打磨",
    valueTags: ["保研加分", "综测加分"],
    helps: ["保研", "考研", "就业"],
    officialUrl: "https://jsjds.blcu.edu.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://jsjds.blcu.edu.cn/",
        title: "中国大学生计算机设计大赛官网（北语承办）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "阿里天池数据竞赛",
    aliases: ["天池", "阿里云天池"],
    summary:
      "阿里云天池平台主办的数据科学与算法竞赛，含大学生赛道，实战真实业务数据，算法/数据方向核心证明。",
    organizer: "阿里云计算有限公司（天池平台）",
    level: "national",
    frequency: "irregular",
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["人工智能", "计算机", "数据科学", "统计", "数学"],
    prereq: "Python、机器学习基础、数据分析能力；个人或团队",
    difficulty: 4,
    effortEstimate: "单赛季 1-3 个月",
    valueTags: ["大厂校招加分", "算法能力证明", "科研合作"],
    helps: ["就业", "保研", "算法岗"],
    officialUrl: "https://tianchi.aliyun.com/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://tianchi.aliyun.com/",
        title: "阿里云天池平台官网",
        isPrimary: true,
      },
    ],
  },
  {
    title: "百度飞桨 AI Studio 学习平台",
    aliases: ["飞桨", "PaddlePaddle", "AI Studio"],
    summary:
      "百度飞桨开源深度学习平台 + AI Studio 在线学习社区，含课程/项目/竞赛，AI 方向入门与项目积累常用平台。",
    organizer: "百度（深度学习技术及应用国家工程研究中心）",
    level: "national",
    frequency: "irregular",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["人工智能", "计算机", "数据科学", "自动化"],
    prereq: "Python 基础；对深度学习感兴趣",
    difficulty: 2,
    effortEstimate: "持续学习，项目积累灵活",
    valueTags: ["AI 项目经历", "大厂背书", "学习资源"],
    helps: ["就业", "保研", "AI 方向"],
    officialUrl: "https://aistudio.baidu.com/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://aistudio.baidu.com/",
        title: "百度飞桨 AI Studio 官网",
        isPrimary: true,
      },
    ],
  },
];

async function seed() {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  const createdBy = admin?.id ?? "system-seed";

  for (const e of ENTRIES) {
    const existing = await db
      .select({ id: infoItems.id })
      .from(infoItems)
      .where(eq(infoItems.title, e.title))
      .limit(1);
    if (existing.length) {
      console.log(`[seed-phaseA-plus] 跳过（已存在）: ${e.title}`);
      continue;
    }

    const { id } = await createCompetition(
      {
        title: e.title,
        aliases: e.aliases,
        summary: e.summary,
        organizer: e.organizer,
        level: e.level,
        recognition: "normal",
        frequency: e.frequency,
        suitableGrades: e.suitableGrades,
        suitableMajors: e.suitableMajors,
        prereq: e.prereq,
        teamOrSolo: "both",
        difficulty: e.difficulty,
        effortEstimate: e.effortEstimate,
        valueTags: e.valueTags,
        helps: e.helps,
        officialUrl: e.officialUrl,
        sources: e.sources,
        applicableScopeType: "national",
      },
      createdBy,
    );
    await publishCompetition(id);
    console.log(`[seed-phaseA-plus] ✓ ${e.title} (${e.officialUrl})`);
  }
  console.log("[seed-phaseA-plus] 完成");
  await pool.end();
}

seed().catch((e) => {
  console.error("[seed-phaseA-plus] 失败:", e);
  void pool.end();
  process.exit(1);
});
