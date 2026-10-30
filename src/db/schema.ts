import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { EventInput } from "@/modules/events/schema";
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const events = pgTable(
  "nexus_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    identityKey: text("identity_key"),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull().default("draft"),
    reviewState: text("review_state").notNull().default("unreviewed"),
    reviewMethod: text("review_method").notNull().default("unknown"),
    version: integer("version").notNull().default(1),
    publishedVersion: integer("published_version"),
    publishedData: jsonb("published_data").$type<EventInput>(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    eventEndsAt: timestamp("event_ends_at", { withTimezone: true }),
    registrationOpensAt: timestamp("registration_opens_at", {
      withTimezone: true,
    }),
    registrationClosesAt: timestamp("registration_closes_at", {
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    index("nexus_events_visibility_idx").on(t.status, t.kind, t.mode),
    index("nexus_events_deadline_idx").on(t.registrationClosesAt),
  ],
);
export const revisions = pgTable(
  "nexus_event_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    note: text("note").notNull().default("draft"),
    version: integer("version").notNull(),
    payload: jsonb("payload").$type<EventInput>().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewMethod: text("review_method").notNull().default("unknown"),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("nexus_revision_version_idx").on(t.eventId, t.version)],
);
export const bookmarks = pgTable(
  "nexus_bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("nexus_bookmark_user_event_idx").on(t.userId, t.eventId)],
);
export const legacyMap = pgTable("nexus_legacy_map", {
  legacyId: uuid("legacy_id").primaryKey(),
  eventId: uuid("event_id").references(() => events.id),
  reason: text("reason").notNull(),
});

export const blogIdentities = pgTable(
  "nexus_blog_identities",
  {
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("nexus_blog_subject_idx").on(t.issuer, t.subject),
    uniqueIndex("nexus_blog_user_idx").on(t.userId),
  ],
);
