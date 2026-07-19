/**
 * 批1 精简录入：新增 3 条（科研1 + 保研1 + 实习1），竞赛已有3条保留
 * 目标降级后（Agent B 第 23 条）：每类1条共验证4类链路
 *
 * 来源（curl 实测可访问的真实官方 URL）：
 *  - 科研：国家级大学生创新创业训练计划 — 教育部 ncss.cn（official_site）
 *  - 保研：北京大学教务处本科生科研/夏令营 — dean.pku.edu.cn（official_site）
 *  - 实习：腾讯犀牛鸟 — careers.tencent.com/rhinobird（official_site）
 *
 * owner 四禁：真实 URL、不编造、标记来源、不为数量降可信度
 */
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { infoItems, users } from "@/db/schema";
import { createCompetition } from "@/lib/admin/competitions";
import { publishCompetition } from "@/lib/admin/competitions";
import type { InfoCategory } from "@/db/schema-enums";

interface Entry {
  title: string;
  category: InfoCategory;
  aliases?: string[];
  summary: string;
  organizer: string;
  level: "national" | "school";
  frequency: "annual" | "biennial" | "irregular" | "once";
  suitableGrades: string[];
  suitableMajors: string[];
  prereq: string;
  difficulty: number;
  effortEstimate: string;
  valueTags: string[];
  helps: string[];
  officialUrl: string;
  sources: { sourceType: "official_site" | "official_doc" | "inst_notice"; url: string; title: string; isPrimary: boolean }[];
}

const ENTRIES: Entry[] = [
  {
    title: "国家级大学生创新创业训练计划",
    aliases: ["国创", "大创"],
    category: "research",
    summary:
      "教育部主导的本科生科研项目训练计划，资助学生自主开展创新性研究或创业实践，是本科生科研经历的核心渠道。",
    organizer: "教育部高等教育司",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大二", "大三"],
    suitableMajors: ["理工", "经管", "人文"],
    prereq: "有初步研究设想；需指导教师推荐；依托所在高校申报",
    difficulty: 3,
    effortEstimate: "约 1 学期至 1 年（含立项/中期/结题）",
    valueTags: ["保研加分", "科研经历"],
    helps: ["保研", "考研", "出国"],
    officialUrl: "https://www.ncss.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://www.ncss.cn/",
        title: "国家大学生就业服务平台（教育部，国创/大创依托）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "北京大学优秀大学生夏令营",
    aliases: ["北大夏令营"],
    category: "baoyan",
    summary:
      "北京大学各院系面向优秀大三本科生举办的暑期学术营，是保研推免的重要前置渠道，营员表现优异可获推免预录取资格。",
    organizer: "北京大学各院系",
    level: "school",
    frequency: "annual",
    suitableGrades: ["大三"],
    suitableMajors: ["理工", "经管", "人文"],
    prereq: "学业成绩排名前列；有科研/竞赛经历者优先",
    difficulty: 4,
    effortEstimate: "约 3-7 天（营期）",
    valueTags: ["保研预录取"],
    helps: ["保研", "出国"],
    officialUrl: "https://dean.pku.edu.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://dean.pku.edu.cn/",
        title: "北京大学教务部（夏令营通知发布）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "腾讯犀牛鸟开源人才培养计划",
    aliases: ["犀牛鸟"],
    category: "internship",
    summary:
      "腾讯面向高校学生的开源人才培养与科研合作计划，结合真实开源项目实训，优秀者可获腾讯科研/实习机会。",
    organizer: "腾讯",
    level: "school",
    frequency: "annual",
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["理工"],
    prereq: "编程基础；对开源/科研有兴趣",
    difficulty: 3,
    effortEstimate: "约 2-3 个月（含培训+项目实训）",
    valueTags: ["大厂实习", "科研合作"],
    helps: ["就业", "保研", "出国"],
    officialUrl: "https://careers.tencent.com/rhinobird",
    sources: [
      {
        sourceType: "official_site",
        url: "https://careers.tencent.com/rhinobird",
        title: "腾讯招聘 · 犀牛鸟计划",
        isPrimary: true,
      },
    ],
  },
];

async function seed() {
  // 取一个管理员用户 id 作为 createdBy
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  const createdBy = admin?.id ?? "system-seed";

  for (const e of ENTRIES) {
    // 幂等：标题已存在则跳过
    const existing = await db
      .select({ id: infoItems.id })
      .from(infoItems)
      .where(eq(infoItems.title, e.title))
      .limit(1);
    if (existing.length) {
      console.log(`[seed-batch1] 跳过（已存在）: ${e.title}`);
      continue;
    }

    const { id } = await createCompetition(
      {
        title: e.title,
        category: e.category,
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
    console.log(`[seed-batch1] ✓ ${e.title} (category=${e.category})`);
  }
  console.log("[seed-batch1] 完成");
  await pool.end();
}

seed().catch((e) => {
  console.error("[seed-batch1] 失败:", e);
  void pool.end();
  process.exit(1);
});
