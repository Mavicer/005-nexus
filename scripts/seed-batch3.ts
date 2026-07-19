/**
 * 批2 收尾：子代理查证到的、curl 真实可访问的快速入库（5min 内）
 * 按 B 第30条：能入库的入库，没查完的记未完成清单
 *
 * 本次入库 2 条（广告艺术大赛 + 市场调查与分析大赛，curl 200 真实官网）
 */
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { infoItems, users } from "@/db/schema";
import { createCompetition, publishCompetition } from "@/lib/admin/competitions";

const ENTRIES = [
  {
    title: "全国大学生广告艺术大赛",
    aliases: ["大广赛"],
    summary:
      "面向全国大学生的广告艺术类竞赛，由教育部高教司指导，涵盖策划案/平面/视频/动画/文案等类别。",
    organizer: "教育部高等教育司指导；全国大学生广告艺术大赛组委会",
    officialUrl: "http://www.sun-ada.net/",
    difficulty: 3,
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["广告", "新闻", "艺术", "设计", "营销"],
    sources: [
      {
        sourceType: "official_site" as const,
        url: "http://www.sun-ada.net/",
        title: "全国大学生广告艺术大赛官方网站",
        isPrimary: true,
      },
    ],
  },
  {
    title: "全国大学生市场调查与分析大赛",
    aliases: ["市调大赛"],
    summary:
      "教育部主管的统计学类学科竞赛，由高校统计学类教指委主办，面向全国大学生，强调调查方案设计与数据分析能力。",
    organizer: "教育部高等学校统计学类专业教学指导委员会",
    officialUrl: "http://www.gcxl.edu.cn/",
    difficulty: 3,
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["统计", "经济", "管理", "数学", "社科"],
    sources: [
      {
        sourceType: "official_site" as const,
        url: "http://www.gcxl.edu.cn/",
        title: "全国大学生市场调查与分析大赛官方网站",
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
      console.log(`[seed-batch3] 跳过(已存在): ${e.title}`);
      continue;
    }
    const { id } = await createCompetition(
      {
        title: e.title,
        category: "competition",
        aliases: e.aliases,
        summary: e.summary,
        organizer: e.organizer,
        level: "national",
        recognition: "normal",
        frequency: "annual",
        suitableGrades: e.suitableGrades,
        suitableMajors: e.suitableMajors,
        prereq: "对广告艺术/市场调查有兴趣",
        teamOrSolo: "team",
        difficulty: e.difficulty,
        effortEstimate: "约 1-3 个月",
        valueTags: ["保研加分", "综测加分"],
        helps: ["保研", "考研", "就业"],
        officialUrl: e.officialUrl,
        sources: e.sources,
        applicableScopeType: "national",
      },
      createdBy,
    );
    await publishCompetition(id);
    console.log(`[seed-batch3] ✓ ${e.title}`);
  }
  console.log("[seed-batch3] 完成");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  void pool.end();
  process.exit(1);
});
