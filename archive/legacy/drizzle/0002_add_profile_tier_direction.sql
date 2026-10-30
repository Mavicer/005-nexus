-- ============================================================
-- 0002: user_profiles 加 school_tier + major_direction 两枚举字段
-- Phase A 画像四维个性化（owner 确认"加字段不加表"打磨例外，Agent B 第 36 条放行）
-- 仅 +2 枚举 + +2 字段，不加表、不动其他表/认证/搜索。
-- 注：ALTER TYPE ADD VALUE 不能在事务内执行，故本 migration 不裹事务；
--     新建 TYPE 不受此限。参考 0001_add_internship_category.sql 模式。
-- ============================================================

-- 1. 新建 school_tier 枚举（学校层次：把自由文本 school 归一成可计算的层次）
DO $$ BEGIN
  CREATE TYPE "public"."school_tier" AS ENUM ('C9', 'c985', 'c211', 'doubleFirst', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. 新建 major_direction 枚举（专业方向：把自由文本 major 归一成可计算的方向）
DO $$ BEGIN
  CREATE TYPE "public"."major_direction" AS ENUM (
    'ai_general', 'ai_cv', 'ai_nlp', 'ai_llm', 'ai_robotics',
    'cs_general', 'ee_general', 'business_general', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. user_profiles 加两列（可空，onboarding 可跳过落 null）
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "school_tier" "school_tier";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "major_direction" "major_direction";
