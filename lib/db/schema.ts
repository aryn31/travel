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

  // Null for accounts that have only ever signed in by magic link. Both
  // routes stay open: a password is something you add, not something the
  // account is required to have.
  passwordHash: text("password_hash"),

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

/** Postgres full-text search vector. Drizzle has no built-in tsvector type. */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    /*
     * A storage key, not a URL -- PLAN.md 4.5. It replaces avatar_url, which
     * was declared at the start and never written to; a URL frozen into a
     * row is a provider decision you cannot take back, which is the trap the
     * image move walked into.
     *
     * Kept on the profile rather than joined through `media` like a story
     * cover: avatars render in eleven places, and a join at each one costs
     * far more than a column.
     */
    avatarKey: text("avatar_key"),
    website: text("website"),
    homeCountry: text("home_country"),

    // Searching a writer's name has to find their stories, and a generated
    // column can only read its own row -- so the author side of the index
    // lives here and the story query matches against both.
    //
    // Name only, not bio: a bio that mentions plantain should not put every
    // story that person wrote into the results for "plantain". The handle
    // uses 'simple' because it is an identifier, not English -- the stemmer
    // would turn a handle like "travels" into "travel".
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(display_name, '')), 'A') || setweight(to_tsvector('simple', coalesce(handle, '')), 'A')`,
    ),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Case-insensitive uniqueness: "Aryan" and "aryan" must not both exist,
    // because the handle is the first path segment of every story URL.
    uniqueIndex("profiles_handle_lower_idx").on(sql`lower(${t.handle})`),
    index("profiles_search_idx").using("gin", t.searchVector),
  ],
);

export type Profile = typeof profiles.$inferSelect;

/**
 * Password reset links.
 *
 * Separate from Auth.js's `verification_tokens`: that table is the adapter's
 * and holds sign-in links, and overloading it would mean a reset link and a
 * sign-in link becoming interchangeable -- a reset link would log you in,
 * which is not what it is for.
 *
 * Only the SHA-256 of the token is stored. The plaintext exists in the email
 * and nowhere else, so a leaked database does not hand anyone the ability to
 * take over accounts. Used tokens are deleted rather than flagged: one use,
 * then gone.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Issuing a new link invalidates the old ones, which needs this lookup.
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

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

  // Provenance for images that didn't originate here. Stored even when not
  // displayed: a CC BY-SA photo needs visible credit before it goes public,
  // and losing the attribution makes that impossible to do later.
  credit: text("credit"),
  creditUrl: text("credit_url"),
  license: text("license"),
  sourceUrl: text("source_url"),

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

    // Place carries the same weight as the title: on a travel site the
    // first thing anyone types is where they want to read about, and
    // "Kotor" is often in the place field but nowhere in the prose.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(place_name, '')), 'A') || setweight(to_tsvector('english', coalesce(body_text, '')), 'B')`,
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
