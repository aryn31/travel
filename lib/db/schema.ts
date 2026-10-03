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
  type AnyPgColumn,
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

    /* The banner across the top of a profile. A key, not a URL, for the
       reason set out above the avatar column. */
    coverKey: text("cover_key"),
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
 * Separate from Auth.js's `verification_tokens`, which belongs to the
 * adapter. That table is unused now that magic-link sign-in is gone, but it
 * stays because DrizzleAdapter requires it to be mapped -- and a reset token
 * has different rules anyway: single use, one hour, and it does not sign
 * anyone in.
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

/**
 * A signup waiting on its emailed code.
 *
 * Deliberately not a `users` row with emailVerified null: an account that
 * exists before the address is proved lets anyone squat on an email they do
 * not control, and it puts rows in `users` that every query then has to
 * remember to exclude. Nothing enters `users` until the code is right.
 *
 * Keyed by email so a second attempt replaces the first rather than leaving
 * two live codes for one address. Only the hash of the code is stored, and
 * `attempts` is what actually protects it -- six digits is a million
 * guesses, which is nothing to a script and a lot to a person.
 */
export const pendingSignups = pgTable("pending_signups", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Four states, two questions: can anyone else open it, and does it appear
 * in lists.
 *
 *   draft      no URL anyone else can open; the author is still writing
 *   published  open to everyone, listed everywhere
 *   unlisted   open to anyone holding the link, listed nowhere
 *   private    open to the author alone, listed nowhere
 *
 * `unlisted` was declared in the first migration and never set by anything
 * until now. Every listing query already filters on `= 'published'`, so
 * adding states to this enum hides them from the archive, the home page,
 * profiles and search without touching a single one of those queries.
 */
export const storyStatus = pgEnum("story_status", [
  "draft",
  "published",
  "unlisted",
  "private",
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

  /*
   * When this image stopped being referenced by its story.
   *
   * Not deleted on the spot: removing an image and pressing undo is an
   * ordinary thing to do, and autosave fires a second later. Deleting the
   * file immediately would turn undo into a broken image. So it is marked,
   * and swept once the grace period has passed -- and cleared again if the
   * image comes back.
   */
  orphanedAt: timestamp("orphaned_at"),

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

/* ------------------------------------------------------------------ *
 * Likes
 * ------------------------------------------------------------------ */

/**
 * One row per person per story. The composite primary key is the whole
 * rule: liking twice is not a thing that can happen, enforced by the
 * database rather than by remembering to check first.
 */
export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.storyId] }),
    // The primary key reads user-first, so counting a story's likes would
    // have no index to use.
    index("likes_story_idx").on(t.storyId),
  ],
);

export type Like = typeof likes.$inferSelect;

/* ------------------------------------------------------------------ *
 * Comments
 * ------------------------------------------------------------------ */

export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /*
     * One level deep, and only one. Enforced in lib/comments.ts rather than
     * by the column, because the column cannot express it: a reply to a
     * reply is rewritten to point at the thread's root, so a conversation
     * stays readable instead of marching off the right-hand edge.
     */
    parentId: text("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),

    body: text("body").notNull(),

    /*
     * Soft delete. A removed comment with replies still has to hold its
     * place in the thread, or the replies become answers to nothing -- and
     * a moderator needs to be able to see what was said after the fact.
     * The body is kept; nothing reads it once this is set.
     */
    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // The reading page's query: a story's comments, oldest first.
    index("comments_story_idx").on(t.storyId, t.createdAt),
    index("comments_parent_idx").on(t.parentId),
  ],
);

export type Comment = typeof comments.$inferSelect;

/* ------------------------------------------------------------------ *
 * Tags
 * ------------------------------------------------------------------ */

/**
 * What a story is about, as opposed to where it happened -- place already
 * has country and city, and a second taxonomy answering the same question
 * would just be a worse version of the first. These are kinds of travel:
 * solo, food, hiking, by train.
 *
 * The slug is the identity and the label is what gets shown, so "By train"
 * and "by train" are one tag.
 */
export const tags = pgTable("tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Tag = typeof tags.$inferSelect;

export const storyTags = pgTable(
  "story_tags",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.storyId, t.tagId] }),
    // "Every story with this tag" is the whole point of the table, and the
    // primary key is story-first.
    index("story_tags_tag_idx").on(t.tagId),
  ],
);
