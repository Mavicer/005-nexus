CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '!external-blog-only',
  name TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE nexus_events (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  identity_key TEXT UNIQUE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  review_state TEXT NOT NULL DEFAULT 'unreviewed',
  review_method TEXT NOT NULL DEFAULT 'unknown',
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  published_version INTEGER,
  published_data TEXT CHECK(published_data IS NULL OR json_valid(published_data)),
  verified_at TEXT,
  event_ends_at TEXT,
  registration_opens_at TEXT,
  registration_closes_at TEXT,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX nexus_events_visibility_idx ON nexus_events(status, kind, mode);
CREATE INDEX nexus_events_deadline_idx ON nexus_events(registration_closes_at);
CREATE TABLE nexus_event_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL REFERENCES nexus_events(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL CHECK(version > 0),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  review_method TEXT NOT NULL DEFAULT 'unknown',
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  published_at TEXT,
  UNIQUE(event_id, version)
);
CREATE TABLE nexus_bookmarks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES nexus_events(id),
  created_at TEXT NOT NULL,
  UNIQUE(user_id, event_id)
);
CREATE TABLE nexus_blog_identities (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(issuer, subject)
);
CREATE TABLE nexus_legacy_map (
  legacy_id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT REFERENCES nexus_events(id),
  reason TEXT NOT NULL
);
