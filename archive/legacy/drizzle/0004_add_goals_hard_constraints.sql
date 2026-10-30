-- ============================================================
-- 0004: user_profiles 加 goals（多目标）+ hard_constraints（硬约束）
-- Phase A 4.6（owner 授权打磨例外，Agent B 第 55 条放行动 code）
-- 仅 +2 列（goals text[] + hard_constraints jsonb），不加表、不动其他表/认证/搜索。
-- 参考 0002/0003 模式：ALTER TABLE ADD COLUMN IF NOT EXISTS 幂等。
-- ============================================================

-- 1. goals 多目标数组（text[]，goals[0]=主目标权重0.7，goals[1]=次目标0.3，空回退 goal 单选）
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "goals" text[];

-- 2. hard_constraints 硬约束（jsonb 数组，source 必须 user_declared）
-- 结构：[{id, type, title, value, deadline, consequence, priority, source}]
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "hard_constraints" jsonb;
