-- ============================================================
-- 0006: 给 major_direction 枚举加 medicine/art/humanities 值
-- 修复孤岛1：医学/艺术/文学专业无方向入口（被迫选 other → 走 base → 推 ACM/CFA）
-- Agent B 独立修复（owner 第68条重大失败），ALTER TYPE ADD VALUE 非事务。
-- ============================================================
ALTER TYPE "public"."major_direction" ADD VALUE IF NOT EXISTS 'medicine';
ALTER TYPE "public"."major_direction" ADD VALUE IF NOT EXISTS 'art';
ALTER TYPE "public"."major_direction" ADD VALUE IF NOT EXISTS 'humanities';
