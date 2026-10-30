CREATE TABLE "nexus_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexus_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_state" text DEFAULT 'unreviewed' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_version" integer,
	"published_data" jsonb,
	"verified_at" timestamp with time zone,
	"event_ends_at" timestamp with time zone,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "nexus_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "nexus_legacy_map" (
	"legacy_id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexus_event_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"note" text DEFAULT 'draft' NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"published_at" timestamp with time zone
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
ALTER TABLE "nexus_bookmarks" ADD CONSTRAINT "nexus_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_bookmarks" ADD CONSTRAINT "nexus_bookmarks_event_id_nexus_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."nexus_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_events" ADD CONSTRAINT "nexus_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_legacy_map" ADD CONSTRAINT "nexus_legacy_map_event_id_nexus_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."nexus_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_event_revisions" ADD CONSTRAINT "nexus_event_revisions_event_id_nexus_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."nexus_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_event_revisions" ADD CONSTRAINT "nexus_event_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_event_revisions" ADD CONSTRAINT "nexus_event_revisions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nexus_bookmark_user_event_idx" ON "nexus_bookmarks" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "nexus_events_visibility_idx" ON "nexus_events" USING btree ("status","kind","mode");--> statement-breakpoint
CREATE INDEX "nexus_events_deadline_idx" ON "nexus_events" USING btree ("registration_closes_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nexus_revision_version_idx" ON "nexus_event_revisions" USING btree ("event_id","version");