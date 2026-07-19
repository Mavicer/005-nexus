-- ============================================================
-- 0001: 给 info_category 枚举加 internship 值
-- 支撑信息库扩充（owner 裁定，Agent B 第 17 条改动 1）
-- 注：ALTER TYPE ADD VALUE 不能在事务内执行，故单独 migration。
-- ============================================================
ALTER TYPE "public"."info_category" ADD VALUE IF NOT EXISTS 'internship';
