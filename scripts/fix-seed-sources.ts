/**
 * 修复种子死链（Agent B 第 24 条方案 a）
 * 幂等：只改 info_sources 数据 + info_items 主办方字段，不动 schema/code
 *
 * 修复项：
 *  数模: mcm.edu.cn/html_cn/node/1(404) → http://www.mcm.edu.cn/(200)
 *  数模: 删 example.edu.cn/jwc/notice/cumcm(假域)
 *  ICPC: 删 example.com/rank/icpc(假域); organizer 修正为 ICPC Foundation
 *  挑战杯: tiaozhanbei.org/notice(死链) → https://www.tiaozhanbei.net/(200); organizer 修正
 *  挑战杯: 删 example.edu.cn/tw/notice/tiaozhanbei(假域)
 */
import { eq, and } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { infoItems, infoSources, competitions } from "@/db/schema";

async function fix() {
  // 1. 数模：更新主来源 URL
  const [shumo] = await db
    .select({ id: infoItems.id })
    .from(infoItems)
    .where(eq(infoItems.title, "全国大学生数学建模竞赛"))
    .limit(1);
  if (shumo) {
    await db
      .update(infoSources)
      .set({ url: "http://www.mcm.edu.cn/" })
      .where(
        and(
          eq(infoSources.infoItemId, shumo.id),
          eq(infoSources.url, "http://www.mcm.edu.cn/html_cn/node/1"),
        ),
      );
    // 删 example 假来源
    await db
      .delete(infoSources)
      .where(
        and(
          eq(infoSources.infoItemId, shumo.id),
          eq(infoSources.url, "https://example.edu.cn/jwc/notice/cumcm"),
        ),
      );
    console.log("[fix] 数模: 主来源改 mcm.edu.cn/, 删 example 假来源 ✓");
  }

  // 2. ICPC：删 example 假来源 + organizer 修正为 ICPC Foundation
  const [icpc] = await db
    .select({ id: infoItems.id })
    .from(infoItems)
    .where(eq(infoItems.title, "ACM-ICPC 国际大学生程序设计竞赛"))
    .limit(1);
  if (icpc) {
    await db
      .delete(infoSources)
      .where(
        and(
          eq(infoSources.infoItemId, icpc.id),
          eq(infoSources.url, "https://example.com/rank/icpc"),
        ),
      );
    await db
      .update(infoSources)
      .set({ title: "ICPC 官网（ICPC Foundation 运营）" })
      .where(
        and(
          eq(infoSources.infoItemId, icpc.id),
          eq(infoSources.url, "https://icpc.global/"),
        ),
      );
    await db
      .update(competitions)
      .set({ organizer: "ICPC Foundation（2018 起独立运营）" })
      .where(eq(competitions.infoItemId, icpc.id));
    console.log("[fix] ICPC: 删 example 假来源, organizer 改 ICPC Foundation ✓");
  }

  // 3. 挑战杯：更新主来源 URL + organizer 修正 + 删 example
  const [tiaozhan] = await db
    .select({ id: infoItems.id })
    .from(infoItems)
    .where(eq(infoItems.title, "挑战杯全国大学生课外学术科技作品竞赛"))
    .limit(1);
  if (tiaozhan) {
    await db
      .update(infoSources)
      .set({ url: "https://www.tiaozhanbei.net/", title: "挑战杯官方网站" })
      .where(
        and(
          eq(infoSources.infoItemId, tiaozhan.id),
          eq(infoSources.url, "https://www.tiaozhanbei.org/notice"),
        ),
      );
    await db
      .delete(infoSources)
      .where(
        and(
          eq(infoSources.infoItemId, tiaozhan.id),
          eq(infoSources.url, "https://example.edu.cn/tw/notice/tiaozhanbei"),
        ),
      );
    await db
      .update(competitions)
      .set({
        organizer: "共青团中央/中国科协/教育部/中国社科院/全国学联",
      })
      .where(eq(competitions.infoItemId, tiaozhan.id));
    console.log("[fix] 挑战杯: 主来源改 tiaozhanbei.net, organizer 修正, 删 example ✓");
  }

  console.log("[fix] 完成");
  await pool.end();
}

fix().catch((e) => {
  console.error("[fix] 失败:", e);
  void pool.end();
  process.exit(1);
});
