-- ============================================================
-- PostgreSQL 扩展初始化脚本（容器首次启动时执行）
--   - pgcrypto：gen_random_uuid()
--   - pg_trgm：兜底子串匹配（官方镜像可用）
--   - pg_jieba / zhparser：中文分词（需自建镜像，MVP 不可用）
--
-- 卡点定夺（Agent B 第 6 条方案 A）：
--   MVP 用 'simple' ts_config + pg_trgm ILIKE 兜底中文召回。
--   部署环境若已含 pg_jieba 则切 ts_config（需一次重建 generated column migration）。
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 尝试启用 pg_jieba（若镜像支持则启用，否则静默跳过）
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_jieba;
    RAISE NOTICE '[init] pg_jieba 已启用（中文分词首选）';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[init] pg_jieba 不可用：% — 降级 simple + pg_trgm', SQLERRM;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS zhparser;
    RAISE NOTICE '[init] zhparser 已启用';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
