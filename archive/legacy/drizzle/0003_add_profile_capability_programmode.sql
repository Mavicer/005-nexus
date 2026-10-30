-- ============================================================
-- 0003: user_profiles 加培养模式 + 能力画像字段
-- Phase A 4.5（owner 授权打磨例外，Agent B 第 50 条放行动 code 第1小步）
-- 仅 +6 枚举 + 1 bool + 6 字段（programMode/isGoAbroad + 5 能力），不加表、不动其他表/认证/搜索。
-- 参考 0002 模式：DO$$ EXCEPTION 兜底幂等，新建 TYPE 不裹事务。
-- ============================================================

-- 1. 培养模式枚举（owner 验收画像 U1 中外合办4+0 用）
DO $$ BEGIN
  CREATE TYPE "public"."program_mode" AS ENUM ('regular', 'sino_foreign', 'joint', 'independent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. 能力画像 5 枚举（readinessGap 因子用，经验区间非固定分数线）
DO $$ BEGIN
  CREATE TYPE "public"."gpa_tier" AS ENUM ('top5', 'top20', 'top50', 'below');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."research_level" AS ENUM ('none', 'project', 'paper');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."competition_capability" AS ENUM ('none', 'provincial', 'national');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."english_level" AS ENUM ('none', 'cet', 'ielts_toefl');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."internship_level" AS ENUM ('none', 'has');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. user_profiles 加 7 列（均 nullable，onboarding 可跳过落 null）
-- is_go_abroad 语义：true=不出国（如4+0中外合办），engine 据此出国通道不加权
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "program_mode" "program_mode";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "is_go_abroad" boolean;  -- true=不出国(4+0)

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "gpa_tier" "gpa_tier";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "research_level" "research_level";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "competition_capability" "competition_capability";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "english_level" "english_level";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "internship_level" "internship_level";
