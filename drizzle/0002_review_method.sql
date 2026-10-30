ALTER TABLE nexus_events ADD COLUMN review_method text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE nexus_event_revisions ADD COLUMN review_method text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE nexus_events ADD CONSTRAINT nexus_review_method_check CHECK (review_method IN ('unknown','human','agent'));
