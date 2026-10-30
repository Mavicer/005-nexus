-- ============================================================
-- 0007: info_items 加 related_majors 字段（专业资源库转型）
-- 按 MajorCategory 标签过滤资源（ai/computer/finance/medicine/engineering/business/art/humanities）
-- ============================================================
ALTER TABLE "public"."info_items"
  ADD COLUMN IF NOT EXISTS "related_majors" text[];
