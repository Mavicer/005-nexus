/**
 * 反事实解释（Phase A 4.4）
 *
 * explainComparison(a, b)：解释为什么推荐 a 排在 b 前。
 *
 * 实现：对齐两 DecisionResult 的 factors 按 name 算 diff，取差异最大的正向因子
 * （a 比 b 高的）+ 负向因子（a 比 b 低的），用 factor.reason 拼文本（不另写话术）。
 * 反事实解释可追溯（铁律②⑥）。
 *
 * 护栏：判断逻辑在 lib 不在 React（铁律⑧）；文案禁 AI/智能/精准。
 */
import type { DecisionResult } from "./engine";
import type { Factor } from "./factors";

/** 对齐两 factors 按 name 算每因子 diff（a.score - b.score） */
function factorDiff(a: Factor[], b: Factor[]): { name: string; diff: number; aFactor: Factor; bFactor: Factor }[] {
  return a.map((af) => {
    const bf = b.find((f) => f.name === af.name);
    return {
      name: af.name,
      diff: af.score - (bf?.score ?? 0),
      aFactor: af,
      bFactor: bf ?? { name: af.name, score: 0, reason: "—", source: "—" },
    };
  });
}

/**
 * 反事实解释：为什么 a 排在 b 前。
 *
 * 输入：两 DecisionResult（a.fitScore > b.fitScore）
 * 输出：一段文本，取差异最大正向因子（a 比 b 高的）+ 负向因子（a 比 b 低的，如有），
 *       用各 factor.reason 拼文本，不另写话术。
 *
 * 例："科研(77) 排在 ACM(73) 前：科研 roi +8（高投入顶会产出硬通货）> ACM roi +3（极高投入拉低），
 *      schoolFit +3 vs 0（211 适配国家级）；两者 majorMatch 持平（同 S 级核心）。"
 */
export function explainComparison(a: DecisionResult, b: DecisionResult): string {
  const diffs = factorDiff(a.factors, b.factors);
  // 正向（a>b）按 diff 降序，负向（a<b）按 diff 升序
  const positive = diffs.filter((d) => d.diff > 0).sort((x, y) => y.diff - x.diff);
  const negative = diffs.filter((d) => d.diff < 0).sort((x, y) => x.diff - y.diff);
  const neutral = diffs.filter((d) => d.diff === 0);

  const head = `${a.recommendation.title}(${a.fitScore}) 排在 ${b.recommendation.title}(${b.fitScore}) 前：`;

  const parts: string[] = [];
  // 差异最大正向因子（a 的优势）
  if (positive.length > 0) {
    const top = positive[0]!;
    parts.push(`${a.recommendation.title} ${top.name} +${top.aFactor.score}（${top.aFactor.reason}）> ${b.recommendation.title} ${top.name} +${top.bFactor.score}`);
  }
  // 负向因子（a 的劣势但总分仍高）
  if (negative.length > 0) {
    const bot = negative[0]!;
    parts.push(`${a.recommendation.title} ${bot.name} ${bot.aFactor.score} < ${b.recommendation.title} ${bot.name} +${bot.bFactor.score}（${bot.bFactor.reason}）`);
  }
  // 持平因子（说明为何其他维度相当）
  if (neutral.length > 0 && positive.length > 0) {
    const neutralNames = neutral.map((d) => d.name).join("、");
    parts.push(`${neutralNames} 持平`);
  }

  return head + parts.join("；") + "。";
}
