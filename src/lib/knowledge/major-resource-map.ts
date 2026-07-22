/**
 * 专业分类→资源映射（专业资源库核心）
 *
 * MajorCategory 是粗粒度专业分类，不和专业名绑定太死。
 * 通过 keywords 关键词匹配用户输入的专业名（金融学/金融工程/投资学→finance）。
 *
 * 护栏：不引 AI；知识库当大脑代码只解析；通用非特调。
 */

export type MajorCategory =
  | "ai"
  | "computer"
  | "finance"
  | "medicine"
  | "engineering"
  | "business"
  | "art"
  | "humanities"
  | "other";

export interface MajorCategoryInfo {
  id: MajorCategory;
  label: string;       // displayName
  keywords: string[];   // 匹配关键词
  skills: string[];     // 该专业推荐技能
}

/** 专业分类清单（含 keywords 匹配 + skills） */
export const MAJOR_CATEGORIES: MajorCategoryInfo[] = [
  {
    id: "ai",
    label: "人工智能",
    keywords: ["人工智能", "AI", "机器学习", "深度学习", "智能科学", "智能"],
    skills: ["Python", "机器学习", "深度学习", "数据结构", "算法"],
  },
  {
    id: "computer",
    label: "计算机 / 软件",
    keywords: ["计算机", "软件", "信息", "网络工程", "数据科学", "CS"],
    skills: ["编程语言", "数据结构", "算法", "操作系统", "数据库"],
  },
  {
    id: "finance",
    label: "金融经济",
    keywords: ["金融", "经济", "投资", "保险", "财政", "贸易", "财务"],
    skills: ["Excel", "Python 金融分析", "财务建模", "数据分析"],
  },
  {
    id: "medicine",
    label: "医学健康",
    keywords: ["医学", "临床", "康复", "药学", "护理", "中医", "口腔", "公共卫生", "生命科学", "生物医学"],
    skills: ["专业课程", "临床技能", "医学英语", "科研方法"],
  },
  {
    id: "engineering",
    label: "工程技术",
    keywords: ["机械", "电气", "自动化", "电子", "通信", "土木", "建筑", "材料", "化工", "航空航天", "工程"],
    skills: ["工程制图", "专业软件", "实验技能", "项目实践"],
  },
  {
    id: "business",
    label: "管理商科",
    keywords: ["管理", "工商", "会计", "市场营销", "人力资源", "物流", "旅游", "商科", "MBA"],
    skills: ["数据分析", "PPT", "沟通表达", "项目管理"],
  },
  {
    id: "art",
    label: "艺术设计",
    keywords: ["艺术", "设计", "美术", "视觉", "动画", "数字媒体", "音乐", "舞蹈", "戏剧", "传媒", "广告"],
    skills: ["设计软件", "作品集", "创意能力", "审美"],
  },
  {
    id: "humanities",
    label: "人文社科",
    keywords: ["文学", "语言", "英语", "翻译", "历史", "哲学", "社会学", "新闻", "法学", "教育", "政治"],
    skills: ["语言能力", "写作", "跨文化沟通", "信息检索"],
  },
  {
    id: "other",
    label: "其他",
    keywords: [],
    skills: [],
  },
];

/** majorDirection → MajorCategory 映射 */
const DIRECTION_TO_CATEGORY: Record<string, MajorCategory> = {
  ai_general: "ai", ai_cv: "ai", ai_nlp: "ai", ai_llm: "ai", ai_robotics: "ai",
  cs_general: "computer",
  ee_general: "engineering",
  business_general: "business",
  medicine: "medicine",
  art: "art",
  humanities: "humanities",
  other: "other",
};

/**
 * 从用户输入的专业名 + majorDirection 推断 MajorCategory。
 * 优先用 majorDirection 映射，其次用 keywords 匹配专业名文本。
 */
export function matchMajorCategory(
  majorText: string | null,
  majorDirection: MajorCategory | string | null,
): MajorCategoryInfo | null {
  // 1. majorDirection 直接映射
  if (majorDirection && DIRECTION_TO_CATEGORY[majorDirection as string]) {
    const catId = DIRECTION_TO_CATEGORY[majorDirection as string];
    return MAJOR_CATEGORIES.find((c) => c.id === catId) ?? null;
  }

  // 2. 专业名关键词匹配
  if (majorText) {
    const text = majorText.toLowerCase();
    for (const cat of MAJOR_CATEGORIES) {
      if (cat.keywords.some((kw) => text.includes(kw.toLowerCase()) || kw.toLowerCase().includes(text))) {
        return cat;
      }
    }
  }

  return null;
}
