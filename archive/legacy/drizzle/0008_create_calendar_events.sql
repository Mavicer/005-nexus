-- ============================================================
-- 0008: calendar_events 表 + 索引（资源日历，转型期既成事实，owner 追认正规化）
--
-- 背景：commit 3390be0 转型期建了此表 + 54 条数据，但未进 schema.ts / 未走 drizzle migration。
-- 第2步正规化：schema.ts 加 calendarEvents pgTable + 本 migration 幂等补建。
--
-- ⚠️ 幂等（must）：运行 DB 已有此表 + 54 条数据。
--    drizzle-kit migrate 跑到本文件时不能报错、不能清数据。
--    全部用 IF NOT EXISTS，已有则 no-op。
--
-- 语义：日期区间（start_date ~ end_date）= 备考/活动期，无结构化"准备阶段"。
--      credibility 是评分体系非真值（护栏3）。
--      不要用 db:push（会重建表丢数据），只用 migrate。
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "start_date" date,
  "end_date" date,
  "description" text,
  "related_majors" text[],
  "official_source" text,
  "source_url" text,
  "credibility" numeric(3,2) DEFAULT 0.8,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "calendar_events_category_idx"
  ON "public"."calendar_events" ("category");

CREATE INDEX IF NOT EXISTS "calendar_events_majors_idx"
  ON "public"."calendar_events" USING gin ("related_majors");

CREATE INDEX IF NOT EXISTS "calendar_events_start_idx"
  ON "public"."calendar_events" ("start_date");
