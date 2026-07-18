/**
 * 收藏查询与操作
 * 护栏2：业务逻辑封装在 lib 模块内，API 只调用
 */
import { and, eq, desc } from "drizzle-orm";

import { db } from "@/db/client";
import { favorites, infoItems } from "@/db/schema";

export interface FavoriteItem {
  favoriteId: string;
  infoItemId: string;
  title: string;
  summary: string | null;
  credibilityScore: string | null;
  favoritedAt: Date;
}

/** 当前用户的收藏列表（按收藏时间倒序） */
export async function listFavorites(userId: string): Promise<FavoriteItem[]> {
  const rows = await db
    .select({
      favoriteId: favorites.id,
      infoItemId: infoItems.id,
      title: infoItems.title,
      summary: infoItems.summary,
      credibilityScore: infoItems.credibilityScore,
      favoritedAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(infoItems, eq(infoItems.id, favorites.infoItemId))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

  return rows.map((r) => ({
    favoriteId: r.favoriteId,
    infoItemId: r.infoItemId,
    title: r.title,
    summary: r.summary,
    credibilityScore: r.credibilityScore,
    favoritedAt: r.favoritedAt,
  }));
}

/** 添加收藏（若已存在则幂等返回） */
export async function addFavorite(
  userId: string,
  infoItemId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  // 校验信息存在且已发布
  const [item] = await db
    .select({ id: infoItems.id })
    .from(infoItems)
    .where(
      and(eq(infoItems.id, infoItemId), eq(infoItems.status, "published")),
    )
    .limit(1);
  if (!item) return { ok: false, reason: "not_found" };

  // 幂等：已存在则跳过（unique 约束兜底）
  await db
    .insert(favorites)
    .values({ userId, infoItemId })
    .onConflictDoNothing();
  return { ok: true };
}

/** 取消收藏 */
export async function removeFavorite(
  userId: string,
  infoItemId: string,
): Promise<void> {
  await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.infoItemId, infoItemId),
      ),
    );
}

/** 当前用户是否已收藏某信息（详情页按钮用） */
export async function isFavorited(
  userId: string,
  infoItemId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.infoItemId, infoItemId),
      ),
    )
    .limit(1);
  return !!row;
}
