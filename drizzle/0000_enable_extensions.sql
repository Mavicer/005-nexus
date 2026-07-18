-- ============================================================
-- 0000: 启用扩展 + 中文全文检索配置（独立于 drizzle 生成的表结构）
-- 顺序：先于表结构执行（drizzle 0000 依赖 gen_random_uuid / tsvector）
--
-- R3 搜索演进（护栏2）：
--   pg_jieba（首选）→ zhparser（备选）→ pg_trgm（兜底）
--   若 pg_jieba 不可用，按 Agent B 指示降级并上报 Developer Update
--
-- 当前状态：本地/官方 postgres:16-alpine 镜像不含 pg_jieba/zhparser，
--   故首版用 pg_trgm 兜底 + 'simple' ts_config（已在 drizzle 0000 中使用）。
--   部署到自建含 pg_jieba 镜像后，替换 ts_config 为 pg_jieba 配置。
--   这是已上报的卡点（见 AGENT_COMMUNICATION.md Developer Update）。
-- ============================================================

-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm：兜底子串匹配（官方镜像可用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 尝试启用 pg_jieba（若镜像支持则启用，否则静默跳过）
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_jieba;
    RAISE NOTICE '[0000] pg_jieba 已启用（中文分词首选）';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[0000] pg_jieba 不可用：% — 降级 simple + pg_trgm', SQLERRM;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS zhparser;
    RAISE NOTICE '[0000] zhparser 已启用';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
