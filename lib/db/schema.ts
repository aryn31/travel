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
  check,
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

    /*
     * Taken down by a moderator. Deliberately not a fifth `status`: the
     * status is the author's choice and this is somebody else's, so
     * folding the two together would let an author set themselves back to
     * Public and undo it. Removed outranks every status; the author keeps
     * the row and can read it, and nobody else can reach it at all.
     */
    removedAt: timestamp("removed_at"),
    removedBy: text("removed_by").references(() => users.id, {
      onDelete: "set null",
    }),

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

/* ------------------------------------------------------------------ *
 * Reports
 * ------------------------------------------------------------------ */

export const reportReason = pgEnum("report_reason", [
  "spam",
  "abuse",
  "copyright",
  "other",
]);

export const reportStatus = pgEnum("report_status", [
  "open",
  "upheld",
  "dismissed",
]);

/**
 * Somebody flagging something that is not theirs.
 *
 * Until now the only moderator was the author of the story a comment sat
 * on -- which answers nothing when the thing being complained about is the
 * story, or when the author is the problem. This is the queue that sits
 * above them.
 *
 * The target is two nullable foreign keys rather than a type/id pair:
 * real references mean a deleted story takes its reports with it, which a
 * polymorphic id column cannot do.
 */
export const reports = pgTable(
  "reports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    storyId: text("story_id").references(() => stories.id, {
      onDelete: "cascade",
    }),
    commentId: text("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    collectionId: text("collection_id").references(() => collections.id, {
      onDelete: "cascade",
    }),

    reason: reportReason("reason").notNull(),
    /** Optional, and the only free text here. */
    detail: text("detail"),

    status: reportStatus("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // The queue's own query: what is still open, oldest first.
    index("reports_status_idx").on(t.status, t.createdAt),
    /*
     * One report per person per thing. Without this, a report button is a
     * counter anyone can run up, and the queue fills with the same
     * complaint from the same account.
     */
    uniqueIndex("reports_one_per_story_idx")
      .on(t.reporterId, t.storyId)
      .where(sql`${t.storyId} is not null`),
    uniqueIndex("reports_one_per_comment_idx")
      .on(t.reporterId, t.commentId)
      .where(sql`${t.commentId} is not null`),
    uniqueIndex("reports_one_per_collection_idx")
      .on(t.reporterId, t.collectionId)
      .where(sql`${t.collectionId} is not null`),
    /*
     * Exactly one target of three. A report about nothing, or about two
     * things at once, is a bug that should not be storable -- and with
     * three nullable columns the `<>` trick no longer works, so the count
     * is spelled out.
     */
    check(
      "reports_one_target",
      sql`(
        (case when ${t.storyId} is null then 0 else 1 end)
        + (case when ${t.commentId} is null then 0 else 1 end)
        + (case when ${t.collectionId} is null then 0 else 1 end)
      ) = 1`,
    ),
  ],
);

export type Report = typeof reports.$inferSelect;

/* ------------------------------------------------------------------ *
 * Collections
 * ------------------------------------------------------------------ */

/**
 * An ordered run of stories: a trip, a theme, a year.
 *
 * A two-week journey is naturally five or six pieces rather than one
 * 4,000-word slab, but published separately they arrive out of order and
 * nothing says they belong together. This is the thing that says so.
 *
 * Reuses `story_status` rather than declaring its own: a collection
 * answers exactly the same two questions a story does -- can anyone else
 * open it, and is it listed -- so lib/visibility.ts applies unchanged.
 */
export const collections = pgTable(
  "collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    slug: text("slug").notNull(),
    title: text("title").notNull().default(""),
    /** Why these belong together. Shown above the list. */
    description: text("description"),

    status: storyStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),

    /*
     * Taken down by a moderator, exactly as on `stories` and for the same
     * reason: status is the owner's choice and this is somebody else's.
     * A trip has a title and a description of its own, so it is user text
     * that can need removing even when every story in it is fine.
     */
    removedAt: timestamp("removed_at"),
    removedBy: text("removed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Per owner, like story slugs: the URL is /@handle/trips/slug, so two
    // people can both have a "patagonia".
    uniqueIndex("collections_owner_slug_idx").on(t.ownerId, t.slug),
    index("collections_owner_idx").on(t.ownerId, t.updatedAt.desc()),
  ],
);

export type Collection = typeof collections.$inferSelect;

/**
 * Which stories, and in what order.
 *
 * `position` is a plain integer rewritten whenever the order changes. A
 * collection is a handful of stories, not a thousand, so the clever
 * fractional-index schemes buy nothing here and cost a lot of reading.
 *
 * Deliberately not unique on (collection, position): reordering would then
 * need a deferred constraint or a temporary value to shuffle through, and
 * a duplicate position only means two stories tie -- which the next
 * reorder fixes.
 */
export const collectionStories = pgTable(
  "collection_stories",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.storyId] }),
    index("collection_stories_order_idx").on(t.collectionId, t.position),
    // "Which collections is this story in" -- the story page asks it on
    // every read, and the primary key is collection-first.
    index("collection_stories_story_idx").on(t.storyId),
  ],
);

/* ------------------------------------------------------------------ *
 * Saves
 * ------------------------------------------------------------------ */

/**
 * Keeping something to read later.
 *
 * Private by construction: nobody is told what anyone else has saved, and
 * there is no count anywhere. A like is a public signal to the writer; a
 * save is a note to yourself, and conflating the two would make people
 * think twice about both.
 *
 * Two nullable targets with a check constraint, the same shape as
 * `reports` -- real foreign keys mean a deleted story takes its saves with
 * it, which a polymorphic id column cannot do.
 */
export const saves = pgTable(
  "saves",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    storyId: text("story_id").references(() => stories.id, {
      onDelete: "cascade",
    }),
    collectionId: text("collection_id").references(() => collections.id, {
      onDelete: "cascade",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // The list's own query: what this person saved, most recent first.
    index("saves_user_idx").on(t.userId, t.createdAt.desc()),
    // Saving twice is not a thing that can happen.
    uniqueIndex("saves_one_per_story_idx")
      .on(t.userId, t.storyId)
      .where(sql`${t.storyId} is not null`),
    uniqueIndex("saves_one_per_collection_idx")
      .on(t.userId, t.collectionId)
      .where(sql`${t.collectionId} is not null`),
    check(
      "saves_one_target",
      sql`(${t.storyId} is null) <> (${t.collectionId} is null)`,
    ),
  ],
);

export type Save = typeof saves.$inferSelect;

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export const notificationKind = pgEnum("notification_kind", [
  "like",
  "comment",
  "reply",
  /*
   * A moderator took something down, or put it back.
   *
   * Nobody should find out that their work has vanished by noticing the
   * gap. These two exist so the one person most affected by a removal is
   * the one person certain to be told about it.
   */
  "removed",
  "restored",
]);

/**
 * Telling a writer that something happened while they were not looking.
 *
 * Twenty-three likes and seven comments existed on this site before this
 * table did, and not one person had been told about any of them. That is
 * the whole argument for it.
 *
 * Written on the spot rather than derived from `likes` and `comments` on
 * read: a notification has its own read/unread state, and deriving one
 * means recomputing "what is new since you last looked" on every page
 * load for everybody.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Who is being told. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Who did it. Null once that account is gone; the event still happened. */
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),

    kind: notificationKind("kind").notNull(),

    storyId: text("story_id").references(() => stories.id, {
      onDelete: "cascade",
    }),
    commentId: text("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    collectionId: text("collection_id").references(() => collections.id, {
      onDelete: "cascade",
    }),

    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt.desc()),
    /*
     * One like notification per person per story, ever.
     *
     * Unliking and liking again is a thing people do by accident, and
     * three identical lines saying the same person liked the same story is
     * how an inbox becomes something to ignore. Comments get no such index
     * -- each one is a different thing said.
     */
    uniqueIndex("notifications_one_like_idx")
      .on(t.userId, t.actorId, t.storyId)
      .where(sql`${t.kind} = 'like'`),
  ],
);

export type Notification = typeof notifications.$inferSelect;

/* ------------------------------------------------------------------ *
 * Account deletion
 * ------------------------------------------------------------------ */

/**
 * A deletion waiting on a code.
 *
 * Deleting an account is the one action on this site that cannot be
 * undone, so it is the one that asks you to prove you are holding the
 * email address as well as the session. A stolen laptop with a signed-in
 * browser should not be able to erase somebody's writing.
 *
 * Keyed by user, so asking twice replaces the first code rather than
 * leaving two live.
 */
export const accountDeletions = pgTable("account_deletions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
