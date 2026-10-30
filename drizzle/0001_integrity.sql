ALTER TABLE nexus_events ADD COLUMN identity_key text;
--> statement-breakpoint
UPDATE nexus_events SET identity_key=rtrim(published_data->>'officialUrl','/') || '#' || (published_data->>'edition') WHERE status='published';
--> statement-breakpoint
CREATE UNIQUE INDEX nexus_published_identity_idx ON nexus_events(identity_key) WHERE status='published';
--> statement-breakpoint
ALTER TABLE nexus_events ADD CONSTRAINT nexus_status_check CHECK (status IN ('draft','published','withdrawn')),
 ADD CONSTRAINT nexus_review_check CHECK (review_state IN ('unreviewed','verified','needs_review')),
 ADD CONSTRAINT nexus_version_check CHECK (version > 0 AND (published_version IS NULL OR published_version <= version)),
 ADD CONSTRAINT nexus_public_check CHECK (status <> 'published' OR (published_data IS NOT NULL AND published_version IS NOT NULL AND verified_at IS NOT NULL AND identity_key IS NOT NULL)),
 ADD CONSTRAINT nexus_deadline_order CHECK (registration_opens_at IS NULL OR registration_closes_at IS NULL OR registration_opens_at < registration_closes_at),
 ADD CONSTRAINT nexus_published_revision_fk FOREIGN KEY (id,published_version) REFERENCES nexus_event_revisions(event_id,version) DEFERRABLE INITIALLY DEFERRED;
