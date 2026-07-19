/**
 * 重算指定 info_items 的 credibility_score（删/改来源后调用）
 * 用法: tsx scripts/recalc-credibility.ts
 */
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { infoItems, infoSources } from "@/db/schema";
import { computeCredibilityScore } from "@/lib/credibility";

async function recalc() {
  const titles = [
    "全国大学生数学建模竞赛",
    "ACM-ICPC 国际大学生程序设计竞赛",
    "挑战杯全国大学生课外学术科技作品竞赛",
  ];
  for (const title of titles) {
    const [item] = await db
      .select({ id: infoItems.id, expireAt: infoItems.expireAt, lastVerifiedAt: infoItems.lastVerifiedAt })
      .from(infoItems)
      .where(eq(infoItems.title, title))
      .limit(1);
    if (!item) continue;
    const sources = await db
      .select({ sourceType: infoSources.sourceType, authorityWeight: infoSources.authorityWeight })
      .from(infoSources)
      .where(eq(infoSources.infoItemId, item.id));
    const score = computeCredibilityScore({
      sources: sources.map((s) => ({ sourceType: s.sourceType, authorityWeight: Number(s.authorityWeight) })),
      lastVerifiedAt: item.lastVerifiedAt,
      expireAt: item.expireAt,
    });
    await db
      .update(infoItems)
      .set({ credibilityScore: score.toFixed(2), lastUpdatedAt: new Date() })
      .where(eq(infoItems.id, item.id));
    console.log(`[recalc] ${title}: ${score.toFixed(2)} (sources=${sources.length})`);
  }
  await pool.end();
}

recalc().catch((e) => {
  console.error(e);
  void pool.end();
  process.exit(1);
});
