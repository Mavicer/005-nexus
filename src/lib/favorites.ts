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
  signUpEnd: Date | null;
  expireAt: Date | null;
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
      signUpEnd: infoItems.expireAt,
      expireAt: infoItems.expireAt,
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
    signUpEnd: r.signUpEnd,
    expireAt: r.expireAt,
  }));
}

/** 机会池分组（P5 任务3）：即将截止 / 近期 / 长期 */
export interface FavoritesGrouped {
  closing: FavoriteItem[]; // signUpEnd/expireAt 30 天内
  recent: FavoriteItem[]; // 最近收藏（createdAt 倒序 top N）
  longterm: FavoriteItem[]; // 截止较远或无截止
}

/** 机会池分组：按 signUpEnd/expireAt 分（复用 listFavorites，前端分组也行，lib 提供便利方法） */
export function groupFavorites(items: FavoriteItem[], now = new Date()): FavoritesGrouped {
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const closing: FavoriteItem[] = [];
  const longterm: FavoriteItem[] = [];
  for (const it of items) {
    const end = it.signUpEnd ?? it.expireAt;
    if (!end) {
      longterm.push(it);
    } else {
      const diff = end.getTime() - now.getTime();
      if (diff < THIRTY_DAYS) closing.push(it);
      else longterm.push(it);
    }
  }
  // recent = 最近收藏 top 5（已按 favoritedAt 倒序）
  const recent = items.slice(0, 5);
  return { closing, recent, longterm };
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
