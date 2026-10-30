import { directoryRank } from "./directory";
// Editorial judgement, separate from official directory inclusion or university grades.
// Levels consider established professional use, technical work and the specific event,
// rather than sponsor prestige or treating routine practice rounds as championship awards.
type Assessment = { level: 1 | 2 | 3; reason: string };
const assessments: Record<string, Assessment> = {
  "cumcm-2026": {
    level: 3,
    reason: "国内本科数学建模主流赛事，考察完整建模、验证与论文表达。",
  },
  "gmcm-2026": {
    level: 3,
    reason: "研究生数学建模代表性赛事，适合有相应学籍与研究基础的队伍。",
  },
  "comap-mcm-icm-2027": {
    level: 3,
    reason:
      "长期举办的国际大学生建模赛事，重点是建模论证与英文报告，不因未匹配国内目录而降低专业定位。",
  },
  "ccf-ccsp-2026": {
    level: 3,
    reason:
      "CCF主办的计算机系统与程序设计竞赛，系统与算法方向的针对性强；不与名称相近的目录赛事混认。",
  },
  "robomaster-rmuc-2027": {
    level: 3,
    reason:
      "机器人综合工程代表性赛事，要求视觉、电控、机械和团队工程协作；不同赛段及奖项的认可度仍有区别。",
  },
  "nuedc-ti-analog-2026": {
    level: 3,
    reason: "电赛体系内的模拟电子专题赛，重视现场设计、制作与测试能力。",
  },
  "nuedc-intel-embedded-ai-2026": {
    level: 3,
    reason: "电赛体系内的嵌入式AI专题赛，强调软硬件协同与完整工程作品。",
  },
  "nuedc-renesas-frontier-2026": {
    level: 3,
    reason: "电赛体系内的信息科技前沿专题赛，要求系统实物、技术报告与评审。",
  },
  "smartcar-21-2026": {
    level: 3,
    reason: "嵌入式与控制方向的成熟工程赛事，重视长期调试与现场运行表现。",
  },
  "lanqiao-18-programming-2027": {
    level: 2,
    reason:
      "覆盖面较广的程序设计赛事；组别、赛段与奖项差异明显，不把参赛证书等同高等级奖项。",
  },
  "computer-design-4c-2026": {
    level: 2,
    reason: "成熟的大学生作品类赛事，开发赛项适合软件、物联网与AI应用项目。",
  },
  "cnsoftbei-15-2026": {
    level: 2,
    reason: "面向企业题目的完整软件开发实践，比仅提交概念展示更重视工程实现。",
  },
  "fwwb-17-2026": {
    level: 2,
    reason: "成熟的企业命题与服务创新项目赛事，适合交付完整应用与团队项目。",
  },
  "huawei-ict-innovation-2027": {
    level: 2,
    reason:
      "有持续赛制的ICT技术赛事；创新赛按具体赛题和作品评价，不只按华为品牌加分。",
  },
  "embedded-soc-application-2026": {
    level: 2,
    reason: "嵌入式系统方向的成熟项目赛，要求软硬件作品与技术答辩。",
  },
  "embedded-fpga-2026": {
    level: 2,
    reason: "FPGA与数字系统方向的专门赛事，包含作品和编程能力考核。",
  },
  "robomaster-rmul-2027": {
    level: 2,
    reason:
      "适合校队建立工程基础的区域机器人赛事，与RMUC全国赛的竞争层级分开评价。",
  },
  "robomaster-rmua-2026": {
    level: 2,
    reason:
      "有明确仿真任务与自动评测的机器人算法赛，适合视觉、规划和控制方向。",
  },
  "mathorcup-bigdata-2026": {
    level: 2,
    reason: "面向数据分析与建模的专题实践，与MathorCup其他赛项和国赛分别评价。",
  },
  "atcoder-ahc074-2026": {
    level: 2,
    reason:
      "启发式优化算法的实战挑战；技术训练价值较强，不等同校级认定或国家级奖项。",
  },
  "hkcert-ctf-2026": {
    level: 2,
    reason: "有明确分组与竞赛任务的区域网络安全赛事，适合CTF能力实践。",
  },
  "picoctf-2026": {
    level: 2,
    reason:
      "持续举办的安全教育与CTF竞赛，适合建立基础；参赛资格与奖项资格须分别确认。",
  },
  "moonbit-software-synthesis-2026": {
    level: 2,
    reason:
      "以软件合成与可运行代码为核心，适合编程语言和程序生成方向的专项实践。",
  },
  "tcei-embodied-challenge-2026": {
    level: 2,
    reason: "面向无人系统具身智能的专门算法任务，技术方向明确。",
  },
  "atcoder-abc482": {
    level: 1,
    reason: "优质的日常算法训练轮次，不把单次常规周赛等同重要锦标赛奖项。",
  },
  "shuwei-autumn-2026": {
    level: 1,
    reason:
      "可用于建模团队磨合与论文练习，暂不与国赛、美赛按同一专业层级评价。",
  },
};
const labels = ["新兴赛事", "实践体验", "重点赛事", "专业标杆"] as const;
export function editorialAssessment(slug: string) {
  const assessment = Object.hasOwn(assessments, slug)
    ? assessments[slug]
    : undefined;
  return assessment
    ? { ...assessment, label: labels[assessment.level] }
    : {
        level: 1 as const,
        label: labels[1],
        reason:
          "适合快速开发与作品实践；暂未按主办方品牌赋予更高的奖项认可度。",
      };
}
export function recognitionPriority(slug: string) {
  return (
    editorialAssessment(slug).level * 2 + (directoryRank(slug) > 0 ? 1 : 0)
  );
}
// Only reviewed identifiers enter SQL. Unreviewed events keep the practice baseline.
export function recognitionPrioritySql(slugColumn: string): string {
  const clauses = Object.keys(assessments).map((slug) => {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid editorial slug");
    return `WHEN '${slug}' THEN ${recognitionPriority(slug)}`;
  });
  return `CASE ${slugColumn} ${clauses.join(" ")} ELSE 2 END`;
}
