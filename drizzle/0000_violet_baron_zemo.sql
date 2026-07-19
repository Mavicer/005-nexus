CREATE TYPE "public"."applicable_scope_type" AS ENUM('national', 'province', 'school');--> statement-breakpoint
CREATE TYPE "public"."competition_frequency" AS ENUM('annual', 'biennial', 'irregular', 'once');--> statement-breakpoint
CREATE TYPE "public"."competition_level" AS ENUM('school', 'provincial', 'national', 'international');--> statement-breakpoint
CREATE TYPE "public"."competition_recognition" AS ENUM('official_A', 'leaderboard_listed', 'normal');--> statement-breakpoint
CREATE TYPE "public"."info_category" AS ENUM('competition', 'research', 'exam', 'scholarship', 'baoyan', 'opportunity', 'internship');--> statement-breakpoint
CREATE TYPE "public"."info_status" AS ENUM('draft', 'pending', 'published', 'archived', 'removed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official_doc', 'inst_notice', 'authority_list', 'student_exp', 'community', 'official_site');--> statement-breakpoint
CREATE TYPE "public"."team_or_solo" AS ENUM('team', 'solo', 'both');--> statement-breakpoint
CREATE TABLE "competition_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"info_item_id" uuid PRIMARY KEY NOT NULL,
	"organizer" text,
	"level" "competition_level" NOT NULL,
	"recognition" "competition_recognition" DEFAULT 'normal' NOT NULL,
	"sign_up_start" timestamp with time zone,
	"sign_up_end" timestamp with time zone,
	"result_date" timestamp with time zone,
	"frequency" "competition_frequency" DEFAULT 'annual' NOT NULL,
	"valid_year" integer,
	"suitable_grades" text[],
	"suitable_majors" text[],
	"prereq" text,
	"team_or_solo" "team_or_solo" DEFAULT 'both' NOT NULL,
	"team_size" text,
	"difficulty" smallint DEFAULT 3 NOT NULL,
	"effort_estimate" text,
	"value_tags" text[],
	"helps" text[],
	"official_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"info_item_id" uuid NOT NULL,
	"content" text NOT NULL,
	"source_url" text,
	"author" text,
	"authority_weight" numeric(2, 1) DEFAULT '0.4' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"info_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "info_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "info_category" NOT NULL,
	"title" text NOT NULL,
	"aliases" text[],
	"summary" text,
	"applicable_scope_type" "applicable_scope_type" DEFAULT 'national' NOT NULL,
	"applicable_scope_value" text,
	"status" "info_status" DEFAULT 'draft' NOT NULL,
	"credibility_score" numeric(3, 2),
	"last_verified_at" timestamp with time zone,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expire_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "info_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"info_item_id" uuid NOT NULL,
	"source_type" "source_type" NOT NULL,
	"authority_weight" numeric(2, 1) NOT NULL,
	"url" text,
	"title" text,
	"archived_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "competition_rounds" ADD CONSTRAINT "competition_rounds_competition_id_competitions_info_item_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("info_item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_info_item_id_info_items_id_fk" FOREIGN KEY ("info_item_id") REFERENCES "public"."info_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_info_item_id_info_items_id_fk" FOREIGN KEY ("info_item_id") REFERENCES "public"."info_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_info_item_id_info_items_id_fk" FOREIGN KEY ("info_item_id") REFERENCES "public"."info_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_sources" ADD CONSTRAINT "info_sources_info_item_id_info_items_id_fk" FOREIGN KEY ("info_item_id") REFERENCES "public"."info_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_rounds_comp_sort_idx" ON "competition_rounds" USING btree ("competition_id","sort_order");--> statement-breakpoint
CREATE INDEX "competitions_level_idx" ON "competitions" USING btree ("level");--> statement-breakpoint
CREATE INDEX "competitions_recognition_idx" ON "competitions" USING btree ("recognition");--> statement-breakpoint
CREATE INDEX "competitions_suitable_grades_idx" ON "competitions" USING gin ("suitable_grades");--> statement-breakpoint
CREATE INDEX "competitions_suitable_majors_idx" ON "competitions" USING gin ("suitable_majors");--> statement-breakpoint
CREATE INDEX "competitions_sign_up_end_idx" ON "competitions" USING btree ("sign_up_end");--> statement-breakpoint
CREATE INDEX "competitions_valid_year_idx" ON "competitions" USING btree ("valid_year");--> statement-breakpoint
CREATE INDEX "experiences_info_item_id_idx" ON "experiences" USING btree ("info_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_item_idx" ON "favorites" USING btree ("user_id","info_item_id");--> statement-breakpoint
CREATE INDEX "info_items_search_vector_idx" ON "info_items" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "info_items_category_status_idx" ON "info_items" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "info_items_scope_type_idx" ON "info_items" USING btree ("applicable_scope_type");--> statement-breakpoint
CREATE INDEX "info_items_expire_at_idx" ON "info_items" USING btree ("expire_at");--> statement-breakpoint
CREATE INDEX "info_sources_info_item_id_idx" ON "info_sources" USING btree ("info_item_id");