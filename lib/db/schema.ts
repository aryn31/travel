import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
  index,
  primaryKey,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ------------------------------------------------------------------ *
 * Auth.js tables. Shapes are dictated by @auth/drizzle-adapter --
 * don't rename the TS property names, only the SQL column names.
 * ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: text("role", { enum: ["user", "editor", "admin"] })
    .notNull()
    .default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ *
 * Application tables.
 * ------------------------------------------------------------------ */

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    website: text("website"),
    homeCountry: text("home_country"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // Case-insensitive uniqueness: "Aryan" and "aryan" must not both exist,
  // because the handle is the first path segment of every story URL.
  (t) => [uniqueIndex("profiles_handle_lower_idx").on(sql`lower(${t.handle})`)],
);

export type Profile = typeof profiles.$inferSelect;

/** Postgres full-text search vector. Drizzle has no built-in tsvector type. */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const storyStatus = pgEnum("story_status", [
  "draft",
  "published",
  "unlisted",
]);

export const media = pgTable("media", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Which story the upload belongs to. Needed to enforce the per-story cap
  // and to know what to delete from storage when a story goes.
  storyId: text("story_id"),
  storageKey: text("storage_key").notNull(),
  // Stored at upload time so the reading page can reserve space before the
  // image loads -- no layout shift on a photo-heavy story.
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  blurhash: text("blurhash"),
  alt: text("alt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stories = pgTable(
  "stories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull().default(""),
    subtitle: text("subtitle"),

    // body_json is the source of truth (TipTap doc from Week 2 on); body_text
    // is the flattened copy that search and excerpts read. Storing HTML here
    // instead would mean sanitising forever -- see PLAN.md 4.2.
    bodyJson: jsonb("body_json").notNull().default({ type: "doc", content: [] }),
    bodyText: text("body_text").notNull().default(""),

    // Prose only -- headings excluded. body_text runs them together, which
    // produced excerpts like "...into water. The bay Everything in Kotor".
    excerpt: text("excerpt").notNull().default(""),

    coverMediaId: text("cover_media_id").references(() => media.id, {
      onDelete: "set null",
    }),

    status: storyStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),

    readingMinutes: integer("reading_minutes").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),

    // Flat place fields for now; the places table in phase 2 backfills from
    // these rather than replacing them -- see PLAN.md 4.4.
    placeName: text("place_name"),
    countryCode: text("country_code"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),

    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(body_text, '')), 'B')`,
    ),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Slugs are unique per author, not globally: the URL is /@handle/slug,
    // so two people can both write "three-days-in-lisbon".
    uniqueIndex("stories_author_slug_idx").on(t.authorId, t.slug),
    index("stories_published_idx").on(t.status, t.publishedAt.desc()),
    index("stories_author_updated_idx").on(t.authorId, t.updatedAt.desc()),
    index("stories_search_idx").using("gin", t.searchVector),
  ],
);

export type Story = typeof stories.$inferSelect;
export type Media = typeof media.$inferSelect;
