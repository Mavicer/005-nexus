-- ============================================================
-- PostgreSQL 扩展初始化脚本（容器首次启动时执行）
-- 迁移阶段使用：
--   - pgcrypto：gen_random_uuid()
--   - 中文全文检索扩展（pg_jieba / zhparser），若装不上则降级 pg_trgm
-- 注意：pg_jieba 不在官方镜像中，需自建镜像或改用 pg_trgm。
--       最终方案待 Agent B 在 Developer Update 后确认。
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 中文全文检索：优先 pg_jieba
-- 尝试创建，失败时由应用层降级处理（migration 阶段确认可用性）
DO $$
BEGIN
  -- pg_jieba（首选）
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_jieba;
    RAISE NOTICE 'pg_jieba 已启用';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_jieba 不可用：% — 将考虑 zhparser / pg_trgm', SQLERRM;
  END;

  -- zhparser（备选）
  BEGIN
    CREATE EXTENSION IF NOT EXISTS zhparser;
    RAISE NOTICE 'zhparser 已启用';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- pg_trgm（兜底，子串匹配，相关度差）
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  RAISE NOTICE 'pg_trgm 已启用（兜底）';
END $$;
