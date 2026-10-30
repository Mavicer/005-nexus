CREATE TABLE nexus_blog_identities (
 issuer text NOT NULL, subject text NOT NULL,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX nexus_blog_subject_idx ON nexus_blog_identities(issuer, subject);
CREATE UNIQUE INDEX nexus_blog_user_idx ON nexus_blog_identities(user_id);
