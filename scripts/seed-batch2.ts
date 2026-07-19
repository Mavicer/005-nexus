/**
 * 扩竞赛入库（Agent B 第 24 条）：6-7 条新竞赛
 * 来源：子代理 curl 验证的真实官方 URL（周培源/英语竞赛 URL 实测 http 通）
 *
 * 入库：电子设计/CMC/节能减排/互联网+(中国国际大学生创新大赛)/蓝桥杯/周培源/英语竞赛
 * 全部 official_site 一级来源，computeCredibilityScore 自动算
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
  frequency: "annual" | "biennial";
  suitableGrades: string[];
  suitableMajors: string[];
  prereq: string;
  difficulty: number;
  effortEstimate: string;
  valueTags: string[];
  helps: string[];
  officialUrl: string;
  sources: { sourceType: "official_site" | "official_doc"; url: string; title: string; isPrimary: boolean }[];
}

const ENTRIES: Entry[] = [
  {
    title: "全国大学生电子设计竞赛",
    aliases: ["NUEDC", "电赛", "TI 杯"],
    summary:
      "教育部与工信部共同发起的电子信息类学科竞赛，两年一届，3 人团队 4 天 4 夜半封闭开发，含金量高。",
    organizer: "教育部、工业和信息化部共同发起；全国大学生电子设计竞赛组委会实施",
    level: "national",
    frequency: "biennial",
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["电子", "通信", "自动化", "电气", "计算机", "测控"],
    prereq: "模拟/数字电路、单片机、FPGA、信号处理基础；3 人团队",
    difficulty: 4,
    effortEstimate: "至少 1 年系统训练，赛前集训强度高",
    valueTags: ["保研加分", "综测加分", "考研复试加分"],
    helps: ["保研", "考研", "电子/嵌入式就业"],
    officialUrl: "https://www.nuedc-training.com.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://www.nuedc-training.com.cn/",
        title: "全国大学生电子设计竞赛培训网（组委会官方）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "全国大学生数学竞赛",
    aliases: ["CMC", "数学竞赛"],
    summary:
      "中国数学会主办，面向数学与非数学专业本科生，每年一届，分初赛（笔试）与决赛。",
    organizer: "中国数学会（青年工作与大学生数学竞赛委员会）",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["数学", "理工", "经管"],
    prereq: "数学分析、高等代数（数学专业）；高等数学、线性代数（非数学专业）",
    difficulty: 4,
    effortEstimate: "系统复习 3-6 个月；初赛 2.5 小时笔试",
    valueTags: ["保研加分", "综测加分", "考研复试加分"],
    helps: ["保研", "考研", "数学/金融深造"],
    officialUrl: "https://www.cms.org.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://www.cms.org.cn/",
        title: "中国数学会官网（含竞赛专区）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "全国大学生节能减排社会实践与科技竞赛",
    aliases: ["节能减排", "节能竞赛"],
    summary:
      "教育部能源动力类专业教指委指导、竞赛委员会主办，每年一届，覆盖能源/机械/环境等学科。",
    organizer: "全国大学生节能减排社会实践与科技竞赛委员会（教育部能源动力类专业教指委指导）",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["能源动力", "机械", "电气", "建筑", "环境", "化工"],
    prereq: "工程实践能力、原型制作基础；3-5 人团队",
    difficulty: 4,
    effortEstimate: "半年至 1 年作品打磨",
    valueTags: ["保研加分", "综测加分", "考研复试加分"],
    helps: ["保研", "考研", "新能源/环保就业"],
    officialUrl: "https://www.jienengjianpai.org/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://www.jienengjianpai.org/",
        title: "全国大学生节能减排竞赛官方网站",
        isPrimary: true,
      },
    ],
  },
  {
    title: "中国国际大学生创新大赛",
    aliases: ["互联网+", "创新大赛", "原互联网+大赛"],
    summary:
      "教育部主办，2023 年由\"互联网+大学生创新创业大赛\"更名而来，每年一届，含主赛道/红旅/职教/产业/萌芽等赛道。",
    organizer: "教育部（学生服务与素质发展中心执行）",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大二", "大三", "大四"],
    suitableMajors: ["全部学科"],
    prereq: "创新项目或创业实践基础、商业计划书、路演能力；3-15 人团队",
    difficulty: 4,
    effortEstimate: "半年至 1 年项目打磨",
    valueTags: ["保研加分", "综测加分", "创业扶持资金"],
    helps: ["保研", "创业", "融资", "就业"],
    officialUrl: "https://cy.ncss.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://cy.ncss.cn/",
        title: "全国大学生创业服务网（大赛官方报名平台）",
        isPrimary: true,
      },
    ],
  },
  {
    title: "蓝桥杯全国软件和信息技术专业人才大赛",
    aliases: ["蓝桥杯"],
    summary:
      "工信部人才交流中心与教育部学生信息咨询与就业指导中心联合主办，每年一届，分软件/电子两大类，参赛规模大。",
    organizer: "工业和信息化部人才交流中心、教育部全国高等学校学生信息咨询与就业指导中心",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["计算机", "软件", "电子信息", "通信", "自动化"],
    prereq: "C/C++、Java、Python 任一；数据结构与基础算法",
    difficulty: 3,
    effortEstimate: "3-6 个月备考",
    valueTags: ["保研加分", "综测加分", "大厂校招加分"],
    helps: ["保研", "考研", "IT 行业就业"],
    officialUrl: "https://dasai.lanqiao.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "https://dasai.lanqiao.cn/",
        title: "蓝桥杯大赛官网",
        isPrimary: true,
      },
    ],
  },
  {
    title: "全国周培源大学生力学竞赛",
    aliases: ["周培源", "力学竞赛"],
    summary:
      "教育部高教司委托，中国力学学会/力学教指委/周培源基金会共同主办，两年一届，含个人赛与团体赛。",
    organizer: "教育部高教司委托；中国力学学会、力学教指委、周培源基金会共办",
    level: "national",
    frequency: "biennial",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["力学", "机械", "土木", "航空", "航天", "水利"],
    prereq: "理论力学、材料力学；团体赛需动手与协作",
    difficulty: 4,
    effortEstimate: "1 学期系统复习",
    valueTags: ["保研加分", "综测加分", "考研复试加分"],
    helps: ["保研", "考研", "力学/土木/航空深造"],
    officialUrl: "http://zpy.cstam.org.cn/",
    sources: [
      {
        sourceType: "official_site",
        url: "http://zpy.cstam.org.cn/",
        title: "全国周培源大学生力学竞赛官方网站",
        isPrimary: true,
      },
    ],
  },
  {
    title: "全国大学生英语竞赛",
    aliases: ["NECCS", "英语竞赛"],
    summary:
      "TEFL China 与高等学校大学外语教学研究会联合主办，每年一届，分 A/B/C/D 四类组别，面向全体大学生。",
    organizer: "国际英语外语教师协会中国英语外语教师协会（TEFL China）、高等学校大学外语教学研究会",
    level: "national",
    frequency: "annual",
    suitableGrades: ["大一", "大二", "大三", "大四"],
    suitableMajors: ["全部专业"],
    prereq: "大学英语四级以上水平",
    difficulty: 2,
    effortEstimate: "1-3 个月备考",
    valueTags: ["综测加分", "奖学金加分"],
    helps: ["英语能力证明", "综测", "求职"],
    officialUrl: "http://www.tefl-china.net/",
    sources: [
      {
        sourceType: "official_site",
        url: "http://www.tefl-china.net/",
        title: "全国大学生英语竞赛 NECCS（TEFL China 平台）",
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
      console.log(`[seed-batch2] 跳过(已存在): ${e.title}`);
      continue;
    }
    const { id } = await createCompetition(
      {
        title: e.title,
        category: "competition",
        aliases: e.aliases,
        summary: e.summary,
        organizer: e.organizer,
        level: e.level,
        recognition: "official_A",
        frequency: e.frequency,
        suitableGrades: e.suitableGrades,
        suitableMajors: e.suitableMajors,
        prereq: e.prereq,
        teamOrSolo: "team",
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
    console.log(`[seed-batch2] ✓ ${e.title}`);
  }
  console.log("[seed-batch2] 完成");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  void pool.end();
  process.exit(1);
});
