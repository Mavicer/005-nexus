-- ============================================================
-- 0005: user_profiles 加专业子方向 + 目标方向/岗位两级
-- Phase A+（owner 授权打磨例外，Agent B 第 62 条放行动 code）
-- 仅 +3 枚举 + 3 字段，不加表、不动其他表/认证/搜索。
-- 参考 0002/0003 模式：DO$$ EXCEPTION 兜底幂等。
-- ============================================================

-- 1. 专业子方向枚举（按专业大类分组，覆盖压力测试5模型全学科）
DO $$ BEGIN
  CREATE TYPE "public"."major_sub_direction" AS ENUM (
    -- 自动化类（对应 ee_general 的自动化专业）
    'auto_control', 'auto_embedded', 'auto_robotics', 'auto_ai_cross',
    -- CS 类
    'cs_frontend', 'cs_backend', 'cs_security', 'cs_data',
    -- EE 类（非自动化）
    'ee_signal', 'ee_power', 'ee_comm',
    -- AI 类细分
    'ai_vision_dev', 'ai_nlp_dev', 'ai_llm_eng',
    -- 经管类
    'biz_finance', 'biz_marketing', 'biz_ops',
    -- 医学类（压力测试模型1 临床医学）
    'med_clinical', 'med_research', 'med_basic',
    -- 艺术类（模型3 视觉传达设计）
    'art_visual', 'art_digital', 'art_product',
    -- 文学类（模型5 英语）
    'eng_translation', 'eng_education', 'eng_business', 'eng_literature',
    -- 兜底
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. 目标方向（1级，必填，含 exploration 覆盖迷茫用户）
DO $$ BEGIN
  CREATE TYPE "public"."target_direction" AS ENUM (
    'tech_research',       -- 技术深造（读研/博士）
    'tech_engineering',    -- 技术研发工程（嵌入式/算法/前后端工程师）
    'product_design',      -- 产品与设计
    'business_ops',        -- 商业运营
    'research_academic',   -- 科研学术
    'public_service',      -- 公共服务（考公/选调）
    'exploration'          -- 方向探索（迷茫用户，走探索型推荐）
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. 目标岗位（2级，可选，含 undecided）
DO $$ BEGIN
  CREATE TYPE "public"."target_role" AS ENUM (
    'embedded_engineer', 'control_engineer', 'algorithm_engineer',
    'frontend_engineer', 'backend_engineer', 'data_engineer',
    'product_manager', 'designer',
    'researcher', 'phd_candidate',
    'operations', 'marketing',
    'clinical_doctor',     -- 临床医生（医学深造）
    'teacher',             -- 教师（教育方向）
    'undecided'            -- 暂不确定（探索态/未定岗位）
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. user_profiles 加 3 列（均 nullable，onboarding 可跳过落 null）
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "major_sub_direction" "major_sub_direction";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "target_direction" "target_direction";

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "target_role" "target_role";
