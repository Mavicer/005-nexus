/**
 * 专业资源查询（专业资源库核心）
 *
 * 按 MajorCategory 查 DB 里 relatedMajors 包含该分类的资源，
 * 按 category 分组返回。不计算 fitScore/factors/goalMatch。
 *
 * 护栏：复用 DB 查询（不写裸 SQL 在 page 里）；不引 AI。
 */
import { db } from "@/db/client";
import { infoItems } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import type { MajorCategory } from "@/lib/knowledge/major-resource-map";
import type { InfoCategory } from "@/db/schema-enums";

export interface MajorResourceItem {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  credibilityScore: string | null;
}

export type MajorResources = Partial<Record<string, MajorResourceItem[]>>;

/**
 * 取某专业分类的资源，按 category 分组。
 * 支持 category 过滤（可选）。
 *
 * @param major 专业分类
 * @param category 可选，只取某类资源（如 "competition"）
 */
export async function getMajorResources(
  major: { id: MajorCategory; label: string },
  category?: string,
): Promise<MajorResources> {
  // 查 relatedMajors 包含该分类的 published 资源
  const conditions = [
    eq(infoItems.status, "published"),
    sql`${infoItems.relatedMajors} @> ARRAY[${major.id}]::text[]`,
  ];

  if (category) {
    conditions.push(eq(infoItems.category, category as InfoCategory));
  }

  const rows = await db
    .select({
      id: infoItems.id,
      title: infoItems.title,
      summary: infoItems.summary,
      category: infoItems.category,
      credibilityScore: infoItems.credibilityScore,
    })
    .from(infoItems)
    .where(and(...conditions));

  // 按 category 分组
  const grouped: MajorResources = {};
  for (const row of rows) {
    const cat = row.category as string;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push({
      id: row.id,
      title: row.title,
      summary: row.summary,
      category: row.category,
      credibilityScore: row.credibilityScore,
    });
  }

  return grouped;
}
