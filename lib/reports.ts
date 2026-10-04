import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  collections,
  comments,
  profiles,
  reports,
  stories,
  users,
} from "./db/schema";
import { notify } from "./notifications";
import type { ReportReason } from "./report-rules";

/**
 * The queue that sits above authors.
 *
 * A story's author could already remove comments on their own story, which
 * answers nothing when the complaint is about the story itself, or when
 * the author is the problem. Everything here is about the case where the
 * person who can act is not the person who owns the thing.
 */

export type Target =
  | { kind: "story"; id: string }
  | { kind: "comment"; id: string }
  | { kind: "collection"; id: string };

export type FileResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string };

/**
 * Records a complaint.
 *
 * Reporting the same thing twice is answered as success rather than as an
 * error: the unique index means the second one changes nothing, and
 * telling someone "you already reported this" invites them to wonder
 * whether the first one worked.
 */
export async function fileReport({
  target,
  reporterId,
  reason,
  detail,
}: {
  target: Target;
  reporterId: string;
  reason: ReportReason;
  detail: string | null;
}): Promise<FileResult> {
  const owner = await ownerOf(target);
  if (!owner) return { ok: false, error: "That isn't there any more." };

  /*
   * Reporting yourself is not a thing. An author who wants their own story
   * gone can take it down, and someone who regrets a comment can remove
   * it -- both without a moderator ever seeing it.
   */
  if (owner === reporterId) {
    return { ok: false, error: "You can take down your own work yourself." };
  }

  const existing = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(eq(reports.reporterId, reporterId), targetColumn(target)),
    )
    .limit(1);

  if (existing.length > 0) return { ok: true, duplicate: true };

  await db
    .insert(reports)
    .values({
      reporterId,
      storyId: target.kind === "story" ? target.id : null,
      commentId: target.kind === "comment" ? target.id : null,
      collectionId: target.kind === "collection" ? target.id : null,
      reason,
      detail,
    })
    // The index is the real guard; two clicks in the same second race past
    // the select above and land here.
    .onConflictDoNothing();

  return { ok: true, duplicate: false };
}

/** Which column this kind of target lives in. */
function targetColumn(target: Target) {
  if (target.kind === "story") return eq(reports.storyId, target.id);
  if (target.kind === "comment") return eq(reports.commentId, target.id);
  return eq(reports.collectionId, target.id);
}

/** Who wrote the thing being reported, or null if it is gone. */
async function ownerOf(target: Target): Promise<string | null> {
  if (target.kind === "collection") {
    const [row] = await db
      .select({ ownerId: collections.ownerId })
      .from(collections)
      .where(eq(collections.id, target.id))
      .limit(1);
    return row?.ownerId ?? null;
  }

  if (target.kind === "story") {
    const [row] = await db
      .select({ authorId: stories.authorId })
      .from(stories)
      .where(eq(stories.id, target.id))
      .limit(1);
    return row?.authorId ?? null;
  }

  const [row] = await db
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(and(eq(comments.id, target.id), isNull(comments.deletedAt)))
    .limit(1);
  return row?.authorId ?? null;
}

/** Whether this viewer has already reported this, so the button can say so. */
export async function alreadyReported(
  target: Target,
  viewerId: string | null,
): Promise<boolean> {
  if (!viewerId) return false;
  const [row] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(eq(reports.reporterId, viewerId), targetColumn(target)),
    )
    .limit(1);
  return Boolean(row);
}

export type QueueItem = {
  id: string;
  reason: ReportReason;
  detail: string | null;
  createdAt: Date;
  reporter: string;
  /** Null once the target has been deleted outright rather than removed. */
  target:
    | {
        kind: "story";
        id: string;
        title: string;
        href: string;
        excerpt: string;
        authorHandle: string;
        authorName: string;
        removed: boolean;
      }
    | {
        kind: "comment";
        id: string;
        body: string;
        href: string;
        authorHandle: string;
        authorName: string;
        removed: boolean;
      }
    | {
        kind: "collection";
        id: string;
        title: string;
        href: string;
        excerpt: string;
        authorHandle: string;
        authorName: string;
        removed: boolean;
      }
    | null;
};

/**
 * Open reports, oldest first.
 *
 * Oldest rather than newest: a queue read newest-first starves its own
 * tail, and the complaint nobody has looked at for a week is the one that
 * matters most.
 */
export async function openReports(limit = 100): Promise<QueueItem[]> {
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      detail: reports.detail,
      createdAt: reports.createdAt,
      reporter: profiles.handle,
      storyId: reports.storyId,
      commentId: reports.commentId,
      collectionId: reports.collectionId,
    })
    .from(reports)
    .leftJoin(profiles, eq(profiles.userId, reports.reporterId))
    .where(eq(reports.status, "open"))
    .orderBy(reports.createdAt)
    .limit(limit);

  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      reason: r.reason,
      detail: r.detail,
      createdAt: r.createdAt,
      reporter: r.reporter ?? "someone",
      target: r.storyId
        ? await storyTarget(r.storyId)
        : r.commentId
          ? await commentTarget(r.commentId)
          : r.collectionId
            ? await tripTarget(r.collectionId)
            : null,
    })),
  );
}

async function tripTarget(id: string): Promise<QueueItem["target"]> {
  const [row] = await db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
      removedAt: collections.removedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
    })
    .from(collections)
    .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
    .where(eq(collections.id, id))
    .limit(1);
  if (!row) return null;

  return {
    kind: "collection",
    id: row.id,
    title: row.title || "Untitled trip",
    href: `/@${row.handle}/trips/${row.slug}`,
    excerpt: (row.description ?? "").slice(0, 300),
    authorHandle: row.handle,
    authorName: row.displayName,
    removed: Boolean(row.removedAt),
  };
}

async function storyTarget(id: string): Promise<QueueItem["target"]> {
  const [row] = await db
    .select({
      id: stories.id,
      title: stories.title,
      slug: stories.slug,
      excerpt: stories.excerpt,
      bodyText: stories.bodyText,
      removedAt: stories.removedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(eq(stories.id, id))
    .limit(1);
  if (!row) return null;

  return {
    kind: "story",
    id: row.id,
    title: row.title || "Untitled",
    href: `/@${row.handle}/${row.slug}`,
    excerpt: (row.excerpt || row.bodyText).slice(0, 300),
    authorHandle: row.handle,
    authorName: row.displayName,
    removed: Boolean(row.removedAt),
  };
}

async function commentTarget(id: string): Promise<QueueItem["target"]> {
  /*
   * Two joins onto `profiles` -- the comment's author and the story's --
   * would need a hand-written alias. The link is only for the moderator to
   * click, so a second small query is the clearer trade.
   */
  const [row] = await db
    .select({
      id: comments.id,
      body: comments.body,
      deletedAt: comments.deletedAt,
      slug: stories.slug,
      storyAuthorId: stories.authorId,
      handle: profiles.handle,
      displayName: profiles.displayName,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.authorId))
    .innerJoin(stories, eq(stories.id, comments.storyId))
    .where(eq(comments.id, id))
    .limit(1);
  if (!row) return null;

  const [storyAuthor] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, row.storyAuthorId))
    .limit(1);

  return {
    kind: "comment",
    id: row.id,
    // Kept on a removed comment: a moderator reviewing a removal needs to
    // see what was actually said.
    body: row.body,
    href: `/@${storyAuthor?.handle ?? ""}/${row.slug}#comments`,
    authorHandle: row.handle,
    authorName: row.displayName,
    removed: Boolean(row.deletedAt),
  };
}

/** How many are waiting, for the badge in the header. */
export async function openReportCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.status, "open"));
  return row?.n ?? 0;
}

/**
 * Closes a report, and takes the content down if it was upheld.
 *
 * Both halves in one transaction: a report marked upheld while its target
 * stayed up is the failure mode that makes a queue worthless.
 */
export async function resolveReport({
  reportId,
  moderatorId,
  uphold,
}: {
  reportId: string;
  moderatorId: string;
  uphold: boolean;
}): Promise<{ ok: boolean; paths: string[] }> {
  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.status, "open")))
    .limit(1);
  if (!report) return { ok: false, paths: [] };

  let storyId = report.storyId;
  let removedStory: string | null = null;
  let removedTrip: string | null = null;

  await db.transaction(async (tx) => {
    if (uphold) {
      if (report.storyId) {
        await tx
          .update(stories)
          .set({ removedAt: new Date(), removedBy: moderatorId })
          .where(eq(stories.id, report.storyId));
        // Told after the transaction commits -- see the note below.
        removedStory = report.storyId;
      } else if (report.commentId) {
        // Returned rather than looked up separately: the story id is only
        // needed to recount, and the update already has the row.
        const [removed] = await tx
          .update(comments)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(comments.id, report.commentId))
          .returning({ storyId: comments.storyId });

        if (removed) {
          storyId = removed.storyId;
          // The cached count has to follow, the same recount the author's
          // own removal does.
          await tx
            .update(stories)
            .set({
              commentCount: sql`(select count(*)::int from ${comments}
                                 where ${comments.storyId} = ${removed.storyId}
                                   and ${comments.deletedAt} is null)`,
            })
            .where(eq(stories.id, removed.storyId));
        }
      } else if (report.collectionId) {
        await tx
          .update(collections)
          .set({ removedAt: new Date(), removedBy: moderatorId })
          .where(eq(collections.id, report.collectionId));
        removedTrip = report.collectionId;
      }
    }

    await tx
      .update(reports)
      .set({
        status: uphold ? "upheld" : "dismissed",
        resolvedBy: moderatorId,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId));
  });

  /*
   * After the transaction, not inside it: the removal is what has to be
   * durable, and an author's notification is not worth holding a lock
   * open for.
   */
  if (removedStory) {
    const [owner] = await db
      .select({ authorId: stories.authorId })
      .from(stories)
      .where(eq(stories.id, removedStory))
      .limit(1);
    if (owner) {
      await notify({
        userId: owner.authorId,
        actorId: moderatorId,
        kind: "removed",
        storyId: removedStory,
      });
    }
  }

  if (removedTrip) {
    const [owner] = await db
      .select({ ownerId: collections.ownerId })
      .from(collections)
      .where(eq(collections.id, removedTrip))
      .limit(1);
    if (owner) {
      await notify({
        userId: owner.ownerId,
        actorId: moderatorId,
        kind: "removed",
        collectionId: removedTrip,
      });
    }
  }

  return {
    ok: true,
    paths: storyId
      ? await pathsFor(storyId)
      : removedTrip
        ? await tripPaths(removedTrip)
        : [],
  };
}

/** Puts a removed story back. The mirror of upholding, for a mistake. */
export async function restoreStory(
  storyId: string,
  moderatorId?: string,
): Promise<string[]> {
  const [row] = await db
    .update(stories)
    .set({ removedAt: null, removedBy: null })
    .where(eq(stories.id, storyId))
    .returning({ authorId: stories.authorId });

  // Being told it is back matters as much as being told it went.
  if (row && moderatorId) {
    await notify({
      userId: row.authorId,
      actorId: moderatorId,
      kind: "restored",
      storyId,
    });
  }
  return pathsFor(storyId);
}

/**
 * The pages a change to this story invalidates.
 *
 * Returned from here rather than guessed by the caller: the action has a
 * report id and no idea whose profile the story sits on, and a profile
 * still listing a story that was removed an hour ago is exactly the kind
 * of staleness nobody notices until someone complains twice.
 */
async function pathsFor(storyId: string): Promise<string[]> {
  const [row] = await db
    .select({ slug: stories.slug, handle: profiles.handle })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(eq(stories.id, storyId))
    .limit(1);
  if (!row) return [];
  return [`/@${row.handle}`, `/@${row.handle}/${row.slug}`];
}

/**
 * Recently closed, so a moderator can see what they just did -- and undo
 * it. A removal with no visible way back is a decision nobody will dare
 * make quickly.
 */
export async function recentlyResolved(limit = 10) {
  return db
    .select({
      id: reports.id,
      reason: reports.reason,
      status: reports.status,
      resolvedAt: reports.resolvedAt,
      storyId: reports.storyId,
      commentId: reports.commentId,
      // Null when the report was about a comment, or the story is back up.
      storyStillRemoved: sql<boolean>`${stories.removedAt} is not null`.as(
        "story_still_removed",
      ),
    })
    .from(reports)
    .leftJoin(stories, eq(stories.id, reports.storyId))
    .where(sql`${reports.status} <> 'open'`)
    .orderBy(desc(reports.resolvedAt))
    .limit(limit);
}

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

export type Person = {
  userId: string;
  email: string;
  role: "user" | "editor" | "admin";
  handle: string | null;
  displayName: string | null;
  joined: Date;
  published: number;
  comments: number;
  /** Stories of theirs a moderator has taken down. */
  removed: number;
};

/**
 * Everyone with an account, for the admin's people list.
 *
 * Counts come from three scalar subqueries rather than three joins: a
 * join to `stories` and another to `comments` multiplies the rows against
 * each other, and the resulting numbers are wrong in a way nobody notices
 * until an account has both.
 */
export async function listPeople(): Promise<Person[]> {
  return db
    .select({
      userId: users.id,
      email: sql<string>`coalesce(${users.email}, '')`.as("email"),
      role: users.role,
      handle: profiles.handle,
      displayName: profiles.displayName,
      joined: users.createdAt,
      published: sql<number>`(
        select count(*)::int from ${stories}
        where ${stories.authorId} = ${users.id}
          and ${stories.status} = 'published'
          and ${stories.removedAt} is null
      )`.as("published"),
      comments: sql<number>`(
        select count(*)::int from ${comments}
        where ${comments.authorId} = ${users.id}
          and ${comments.deletedAt} is null
      )`.as("comments"),
      removed: sql<number>`(
        select count(*)::int from ${stories}
        where ${stories.authorId} = ${users.id}
          and ${stories.removedAt} is not null
      )`.as("removed"),
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .orderBy(desc(users.createdAt));
}

/**
 * Changes somebody's role.
 *
 * Refuses to touch your own, which is the whole safety story: an admin
 * who demotes themselves by misclicking has locked everyone out of the
 * queue, and the way back is a command on the server. Let somebody else
 * demote them, or use `npm run admin`.
 */
export async function setRole(
  targetId: string,
  role: "user" | "editor" | "admin",
  actorId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (targetId === actorId) {
    return { ok: false, error: "You can't change your own role." };
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) return { ok: false, error: "No such account." };

  await db.update(users).set({ role }).where(eq(users.id, targetId));
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Stories, from above
 * ------------------------------------------------------------------ */

export type AdminStory = {
  id: string;
  title: string;
  href: string;
  status: string;
  removed: boolean;
  authorHandle: string;
  authorName: string;
  publishedAt: Date | null;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  reports: number;
};

/**
 * Every story on the site, newest first.
 *
 * The reports queue is reactive -- it can only act on what somebody
 * bothered to flag. This is the other half: being able to find a story
 * because you went looking for it.
 *
 * Drafts and private stories are included. A moderator who can take a
 * published story down can already see everything that matters; hiding
 * the rest would only make the list lie about how much is here.
 */
export async function listAllStories(
  query: string | null,
  limit = 100,
): Promise<AdminStory[]> {
  const like = query ? `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

  const rows = await db
    .select({
      id: stories.id,
      title: stories.title,
      slug: stories.slug,
      status: stories.status,
      removedAt: stories.removedAt,
      publishedAt: stories.publishedAt,
      updatedAt: stories.updatedAt,
      likeCount: stories.likeCount,
      commentCount: stories.commentCount,
      handle: profiles.handle,
      displayName: profiles.displayName,
      reports: sql<number>`(
        select count(*)::int from ${reports}
        where ${reports.storyId} = ${stories.id}
      )`.as("reports"),
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(
      like
        ? sql`(${stories.title} ilike ${like} or ${profiles.handle} ilike ${like}
               or ${profiles.displayName} ilike ${like})`
        : sql`true`,
    )
    .orderBy(desc(stories.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title || "Untitled",
    href: `/@${r.handle}/${r.slug}`,
    status: r.status,
    removed: Boolean(r.removedAt),
    authorHandle: r.handle,
    authorName: r.displayName,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    reports: r.reports,
  }));
}

/**
 * Takes a story down without a report to hang it on.
 *
 * The same `removed_at` the reports queue sets, so a story removed from
 * here behaves identically everywhere else -- gone from the archive, the
 * home page and search, still readable by its author and by whoever
 * removed it.
 */
export async function takeDownStory(
  storyId: string,
  moderatorId: string,
): Promise<string[]> {
  const [row] = await db
    .update(stories)
    .set({ removedAt: new Date(), removedBy: moderatorId })
    .where(eq(stories.id, storyId))
    .returning({ authorId: stories.authorId });

  if (row) {
    await notify({
      userId: row.authorId,
      actorId: moderatorId,
      kind: "removed",
      storyId,
    });
  }
  return pathsFor(storyId);
}

/* ------------------------------------------------------------------ *
 * Trips
 * ------------------------------------------------------------------ */

export type AdminTrip = {
  id: string;
  title: string;
  href: string;
  status: string;
  removed: boolean;
  ownerHandle: string;
  ownerName: string;
  parts: number;
  updatedAt: Date;
  reports: number;
};

/**
 * Every collection, for the back office.
 *
 * A trip has a title and a description of its own -- user text that can
 * need removing even when every story inside it is fine. Without this
 * they were the one thing on the site nobody could act on.
 */
export async function listAllTrips(
  query: string | null,
  limit = 100,
): Promise<AdminTrip[]> {
  const like = query ? `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

  const rows = await db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      status: collections.status,
      removedAt: collections.removedAt,
      updatedAt: collections.updatedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
      parts: sql<number>`(
        select count(*)::int from collection_stories cs
        where cs.collection_id = ${collections.id}
      )`.as("parts"),
      reports: sql<number>`(
        select count(*)::int from ${reports}
        where ${reports.collectionId} = ${collections.id}
      )`.as("reports"),
    })
    .from(collections)
    .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
    .where(
      like
        ? sql`(${collections.title} ilike ${like} or ${profiles.handle} ilike ${like}
               or ${profiles.displayName} ilike ${like})`
        : sql`true`,
    )
    .orderBy(desc(collections.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title || "Untitled trip",
    href: `/@${r.handle}/trips/${r.slug}`,
    status: r.status,
    removed: Boolean(r.removedAt),
    ownerHandle: r.handle,
    ownerName: r.displayName,
    parts: r.parts,
    updatedAt: r.updatedAt,
    reports: r.reports,
  }));
}

export async function takeDownTrip(
  collectionId: string,
  moderatorId: string,
): Promise<string[]> {
  const [row] = await db
    .update(collections)
    .set({ removedAt: new Date(), removedBy: moderatorId })
    .where(eq(collections.id, collectionId))
    .returning({ ownerId: collections.ownerId })
    .then((r) => r);

  if (row) {
    await notify({
      userId: row.ownerId,
      actorId: moderatorId,
      kind: "removed",
      collectionId,
    });
  }
  return tripPaths(collectionId);
}

export async function restoreTrip(collectionId: string): Promise<string[]> {
  await db
    .update(collections)
    .set({ removedAt: null, removedBy: null })
    .where(eq(collections.id, collectionId));
  return tripPaths(collectionId);
}

async function tripPaths(collectionId: string): Promise<string[]> {
  const [row] = await db
    .select({ slug: collections.slug, handle: profiles.handle })
    .from(collections)
    .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
    .where(eq(collections.id, collectionId))
    .limit(1);
  if (!row) return [];
  return [`/@${row.handle}`, `/@${row.handle}/trips/${row.slug}`];
}

/**
 * What the site looks like from above, in four numbers.
 *
 * For the front page a moderator sees: the point is to answer "is
 * anything waiting for me" before they have to go and look.
 */
export async function siteSummary() {
  const [row] = await db
    .select({
      open: sql<number>`(select count(*)::int from ${reports}
                         where ${reports.status} = 'open')`,
      stories: sql<number>`(select count(*)::int from ${stories}
                            where ${stories.status} = 'published'
                              and ${stories.removedAt} is null)`,
      removed: sql<number>`(select count(*)::int from ${stories}
                            where ${stories.removedAt} is not null)
                           + (select count(*)::int from ${collections}
                              where ${collections.removedAt} is not null)`,
      trips: sql<number>`(select count(*)::int from ${collections}
                          where ${collections.status} = 'published'
                            and ${collections.removedAt} is null)`,
      people: sql<number>`(select count(*)::int from ${users})`,
    })
    .from(users)
    .limit(1);

  return row ?? { open: 0, stories: 0, removed: 0, trips: 0, people: 0 };
}

/**
 * What has happened lately, for the front page a moderator sees.
 *
 * Three short lists rather than one long feed: the questions are "what is
 * being published", "who has joined" and "what have we done", and a
 * single chronological stream answers none of them well.
 */
export async function recentActivity(limit = 5) {
  const [newStories, newPeople] = await Promise.all([
    db
      .select({
        id: stories.id,
        title: stories.title,
        slug: stories.slug,
        status: stories.status,
        removedAt: stories.removedAt,
        publishedAt: stories.publishedAt,
        handle: profiles.handle,
        displayName: profiles.displayName,
      })
      .from(stories)
      .innerJoin(profiles, eq(profiles.userId, stories.authorId))
      .where(sql`${stories.status} = 'published'`)
      .orderBy(desc(stories.publishedAt))
      .limit(limit),

    db
      .select({
        handle: profiles.handle,
        displayName: profiles.displayName,
        avatarKey: profiles.avatarKey,
        joined: users.createdAt,
        stories: sql<number>`(select count(*)::int from ${stories}
                              where ${stories.authorId} = ${users.id}
                                and ${stories.status} = 'published')`.as("stories"),
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(users.createdAt))
      .limit(limit),
  ]);

  return {
    stories: newStories.map((s) => ({
      title: s.title || "Untitled",
      href: `/@${s.handle}/${s.slug}`,
      author: s.displayName,
      publishedAt: s.publishedAt,
      removed: Boolean(s.removedAt),
    })),
    people: newPeople,
  };
}
