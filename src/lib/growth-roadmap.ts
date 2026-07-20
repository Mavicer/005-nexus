/**
 * 成长路线（P4-2，非 AI，规则模板从知识库提取）
 *
 * 数据结构（owner 强调可扩展，非 string[]）：
 *   goal → stage → actions → relatedCategories 嵌套
 *
 * 数据源：从 `知识库-成长模型/02-成长路线-保研.md`、`03-就业.md`、
 *        `04-科研深造.md` 提取成 TS 常量。
 * 考公/出国/创业知识库未覆盖，按经验结构化 4 阶段，标「经验参考」。
 *
 * 护栏：路线只读、非 AI、措辞「经验参考，因校因专业而异」。
 */
import type { Goal, GoalGrade } from "@/db/schema-enums";
import type { InfoCategory, MajorDirection } from "@/db/schema-enums";

export interface RoadmapAction {
  title: string;
  detail?: string;
  relatedCategories?: InfoCategory[];
  priority?: "high" | "mid" | "low";
}

export interface RoadmapStage {
  grade: GoalGrade;
  title: string;
  actions: RoadmapAction[];
}

export interface Roadmap {
  goal: Goal;
  goalLabel: string;
  note: string; // 「经验参考，因校因专业而异」
  stages: RoadmapStage[]; // 4 个（大一-大四）
}

const COMMON_NOTE = "经验参考，因校因专业而异；具体门槛以各校当年官方办法为准。";

// ---------- 保研（知识库 02） ----------
const BAOYAN: Roadmap = {
  goal: "baoyan",
  goalLabel: "保研",
  note: COMMON_NOTE,
  stages: [
    {
      grade: "freshman",
      title: "大一 · 打地基",
      actions: [
        { title: "保持学业排名靠前", detail: "保研权重最高维度，基础课绩点决定排名起点", priority: "high" },
        { title: "尽早过四六级", detail: "部分夏令营/推免有六级门槛", relatedCategories: ["exam"], priority: "high" },
        { title: "参加入门级竞赛练手", detail: "校赛/省赛积累经验", relatedCategories: ["competition"], priority: "low" },
      ],
    },
    {
      grade: "sophomore",
      title: "大二 · 建经历",
      actions: [
        { title: "维持排名，核心专业课出成绩", priority: "high" },
        { title: "进实验室/科研训练", detail: "校 SRT/国创/大创，争取有产出", relatedCategories: ["research"], priority: "high" },
        { title: "冲国家级高认可竞赛", detail: "数模/ACM/挑战杯等，拿奖对保研加分显著", relatedCategories: ["competition"], priority: "mid" },
      ],
    },
    {
      grade: "junior",
      title: "大三 · 冲刺拿 offer",
      actions: [
        { title: "梳理经历、准备文书、联系导师", priority: "high" },
        { title: "关注夏令营通知并投递", detail: "大三下 3-5 月投材料", relatedCategories: ["baoyan"], priority: "high" },
        { title: "参加夏令营争优秀营员", detail: "6-7 月，优秀营员=预录取", relatedCategories: ["baoyan"], priority: "high" },
        { title: "确保本校推免资格", detail: "9 月底推免系统注册", priority: "high" },
      ],
    },
    {
      grade: "senior",
      title: "大四 · 收尾",
      actions: [
        { title: "推免系统确认并接受拟录取", priority: "high" },
        { title: "按接收校要求完成后续", priority: "mid" },
        { title: "若未拿到资格：转考研/就业/出国", detail: "备选路径", priority: "low" },
      ],
    },
  ],
};

// ---------- 就业（知识库 03） ----------
const EMPLOYMENT: Roadmap = {
  goal: "employment",
  goalLabel: "就业",
  note: COMMON_NOTE,
  stages: [
    {
      grade: "freshman",
      title: "大一 · 打基础",
      actions: [
        { title: "打好专业课基础", priority: "mid" },
        { title: "了解目标行业/岗位方向", detail: "技术岗 vs 非技术岗路径不同", priority: "low" },
        { title: "参加入门竞赛/社团", relatedCategories: ["competition"], priority: "low" },
      ],
    },
    {
      grade: "sophomore",
      title: "大二 · 建项目",
      actions: [
        { title: "做项目（GitHub/开源贡献）", detail: "技术岗尤甚", priority: "high" },
        { title: "参加对口竞赛", detail: "互联网+/挑战杯/数模", relatedCategories: ["competition"], priority: "mid" },
        { title: "关注校招节奏", detail: "大厂春招/秋招/暑期实习", priority: "mid" },
      ],
    },
    {
      grade: "junior",
      title: "大三 · 冲实习拿 return offer",
      actions: [
        { title: "刷题、改简历、投暑期实习", detail: "3-5 月投递", priority: "high" },
        { title: "争取暑期实习 return offer", detail: "大厂暑期转正率高", relatedCategories: ["internship"], priority: "high" },
        { title: "参加大厂训练营", detail: "字节/腾讯/美团等", relatedCategories: ["internship"], priority: "mid" },
      ],
    },
    {
      grade: "senior",
      title: "大四 · 秋招春招",
      actions: [
        { title: "9-11 月秋招（金九银十）", priority: "high" },
        { title: "3-4 月春招补录", priority: "mid" },
        { title: "拿 offer 准备入职", priority: "high" },
      ],
    },
  ],
};

// ---------- 考公（知识库未覆盖，经验结构化） ----------
const CIVIL_SERVICE: Roadmap = {
  goal: "civilService",
  goalLabel: "考公",
  note: COMMON_NOTE,
  stages: [
    {
      grade: "freshman",
      title: "大一 · 打基础",
      actions: [
        { title: "保持学业成绩", detail: "部分选调有成绩/排名要求", priority: "mid" },
        { title: "了解公务员/选调方向", detail: "国考/省考/选调生路径不同", priority: "low" },
      ],
    },
    {
      grade: "sophomore",
      title: "大二 · 了解方向",
      actions: [
        { title: "确定报考方向", detail: "党群/行政/执法/专业技术类", priority: "mid" },
        { title: "争取学生干部经历", detail: "选调生看重", priority: "mid" },
        { title: "参加竞赛/实践丰富简历", relatedCategories: ["competition"], priority: "low" },
      ],
    },
    {
      grade: "junior",
      title: "大三 · 备考启动",
      actions: [
        { title: "系统备考（行测+申论）", priority: "high" },
        { title: "关注目标岗位招录公告", detail: "专业/学历/政治面貌要求", priority: "high" },
        { title: "保持党员/学生干部身份", detail: "选调必要条件之一", priority: "mid" },
      ],
    },
    {
      grade: "senior",
      title: "大四 · 冲刺",
      actions: [
        { title: "参加国考（11-12 月）", priority: "high" },
        { title: "参加省考（次年 3-4 月）", priority: "high" },
        { title: "关注选调生招录", detail: "门槛较高但发展好", priority: "mid" },
      ],
    },
  ],
};

// ---------- 出国（知识库未覆盖，经验结构化） ----------
const ABROAD: Roadmap = {
  goal: "abroad",
  goalLabel: "出国",
  note: COMMON_NOTE,
  stages: [
    {
      grade: "freshman",
      title: "大一 · 打基础",
      actions: [
        { title: "保持高 GPA", detail: "海外院校核心筛选维度", priority: "high" },
        { title: "开始英语学习", detail: "雅思/托福长线准备", relatedCategories: ["exam"], priority: "high" },
      ],
    },
    {
      grade: "sophomore",
      title: "大二 · 建科研经历",
      actions: [
        { title: "进实验室/科研训练", detail: "申请 PhD 尤重科研产出", relatedCategories: ["research"], priority: "high" },
        { title: "首考雅思/托福", detail: "争取达标分数", priority: "high" },
        { title: "参加高认可竞赛", relatedCategories: ["competition"], priority: "mid" },
      ],
    },
    {
      grade: "junior",
      title: "大三 · 标化+套磁",
      actions: [
        { title: "GRE/GMAT 备考（赴美）", priority: "high" },
        { title: "推进课题出成果", detail: "争取论文投出", relatedCategories: ["research"], priority: "high" },
        { title: "套磁意向导师", detail: "PhD 申请关键", priority: "high" },
        { title: "夏校/交换经历", detail: "海外经历加分", priority: "mid" },
      ],
    },
    {
      grade: "senior",
      title: "大四 · 申请季",
      actions: [
        { title: "9-12 月递交申请", detail: "SOP/推荐信/成绩单", priority: "high" },
        { title: "跟进面试/补材料", priority: "mid" },
        { title: "拿 offer 后办签证/选校", priority: "high" },
      ],
    },
  ],
};

// ---------- 创业（知识库未覆盖，经验结构化） ----------
const ENTREPRENEURSHIP: Roadmap = {
  goal: "entrepreneurship",
  goalLabel: "创业",
  note: COMMON_NOTE,
  stages: [
    {
      grade: "freshman",
      title: "大一 · 探索",
      actions: [
        { title: "发现兴趣/痛点方向", priority: "mid" },
        { title: "参加创业社团/讲座", priority: "low" },
      ],
    },
    {
      grade: "sophomore",
      title: "大二 · 建团队试水",
      actions: [
        { title: "组建团队，做 MVP 原型", priority: "high" },
        { title: "参加创业竞赛", detail: "互联网+/挑战杯创业计划", relatedCategories: ["competition"], priority: "mid" },
        { title: "学习商业/财务基础", priority: "mid" },
      ],
    },
    {
      grade: "junior",
      title: "大三 · 验证市场",
      actions: [
        { title: "小范围市场验证/获客", priority: "high" },
        { title: "申请创业孵化器/种子资金", priority: "high" },
        { title: "打磨商业模式", priority: "mid" },
      ],
    },
    {
      grade: "senior",
      title: "大四 · 放大或转型",
      actions: [
        { title: "跑通盈利模型后放大", priority: "high" },
        { title: "争取天使轮投资", priority: "mid" },
        { title: "若未跑通：复盘转型或先就业", detail: "备选路径", priority: "low" },
      ],
    },
  ],
};

const ROADMAPS: Record<Goal, Roadmap> = {
  baoyan: BAOYAN,
  employment: EMPLOYMENT,
  civilService: CIVIL_SERVICE,
  abroad: ABROAD,
  entrepreneurship: ENTREPRENEURSHIP,
};

// ============================================================
// 专业方向覆盖层（Phase A 4.4：ROADMAP_OVERLAYS）
// 在 base 路线之上补 majorDirection 专属 actions（AI 保研大一专属等）。
// 非 AI 方向走 base 不退化。知识库 02-成长路线-保研.md 第五节是真理源。
// ============================================================

/** AI 方向（ai_general/ai_cv/ai_nlp/ai_llm/ai_robotics）保研 overlay actions */
const AI_BAOYAN_OVERLAY: Partial<Record<GoalGrade, RoadmapAction[]>> = {
  freshman: [
    { title: "Python 编程基础", detail: "AI 首选语言，大一打牢，后续科研/ACM 都要用", priority: "high" },
    { title: "C++ 与算法基础", detail: "算法竞赛与底层实现，为 ACM/机试打底", relatedCategories: ["competition"], priority: "high" },
    { title: "高数/线代/概率论保持高分", detail: "AI 数学地基，CV/NLP/LLM 都依赖线代与概率", priority: "high" },
    { title: "LeetCode 刷题起步", detail: "数据结构与算法训练", priority: "mid" },
    { title: "进 AI 实验室做小课题", detail: "积累方向感（CV/NLP/LLM），科研是 AI 保研 S 级核心", relatedCategories: ["research"], priority: "high" },
  ],
  sophomore: [
    { title: "确定 AI 细分方向", detail: "CV/NLP/LLM/机器人，选一个深耕", priority: "high" },
    { title: "科研推进：目标顶会一作/共一", detail: "CV→ICCV/ECCV、NLP→ACL/EMNLP、大模型→开源/预训练", relatedCategories: ["research"], priority: "high" },
    { title: "ACM-ICPC/CCPC 冲区域赛", detail: "AI 院系筛选看重算法与工程能力", relatedCategories: ["competition"], priority: "mid" },
    { title: "开源贡献（LLM 方向）", detail: "大模型方向参与知名开源项目，工程力硬通货", priority: "mid" },
  ],
  junior: [
    { title: "论文投出/课题结题", detail: "夏令营材料核心，科研产出是区分度硬通货", relatedCategories: ["research"], priority: "high" },
    { title: "夏令营投递 AI 强校", detail: "3-5 月投清北复交浙科南哈交+中科院自动化所等", relatedCategories: ["baoyan"], priority: "high" },
    { title: "ACM 冲决赛/区域赛金", detail: "若有算法竞赛线", relatedCategories: ["competition"], priority: "mid" },
  ],
};

/** AI 方向集合 */
const AI_DIRECTIONS: MajorDirection[] = [
  "ai_general",
  "ai_cv",
  "ai_nlp",
  "ai_llm",
  "ai_robotics",
];

/**
 * 按.goal 取完整四阶段路线。
 * Phase A 4.4：加 majorDirection 参数，AI 保研走 overlay（专属 actions 覆盖 base）。
 * 非 AI 方向走 base 不退化。
 */
export function getRoadmap(
  goal: Goal,
  majorDirection?: MajorDirection | null,
): Roadmap {
  const base = ROADMAPS[goal];
  if (!majorDirection || !AI_DIRECTIONS.includes(majorDirection)) {
    return base; // 非 AI 方向走 base 不退化
  }
  if (goal !== "baoyan") {
    return base; // Phase A 只打通 AI 保研 overlay，其余 goal 走 base
  }
  // AI 保研：用 overlay 覆盖对应阶段的 actions
  const aiActionsByGrade = AI_BAOYAN_OVERLAY;
  return {
    ...base,
    note: `${base.note}（AI 方向专属路线，经验参考）`,
    stages: base.stages.map((stage) => {
      const overlayActions = aiActionsByGrade[stage.grade];
      if (!overlayActions || overlayActions.length === 0) return stage;
      return { ...stage, actions: overlayActions };
    }),
  };
}

/** 当前年级之后的阶段数（用于高亮当前） */
export function isCurrentStage(stageGrade: GoalGrade, currentGrade?: GoalGrade | null): boolean {
  return !!currentGrade && stageGrade === currentGrade;
}
