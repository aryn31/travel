import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  accountDeletions,
  collections,
  comments,
  likes,
  media,
  profiles,
  stories,
  users,
} from "./db/schema";
import { remove as removeFromStorage } from "./storage";
import { send } from "./mail";
import {
  codeMatches,
  generateCode,
  hashCode,
  MAX_ATTEMPTS,
  normalizeCode,
  TTL_MS,
} from "./otp";

/**
 * Deleting an account, permanently.
 *
 * The only irreversible action on the site, so it is the only one that
 * asks for the email address as well as the session: a signed-in browser
 * somebody else is holding should not be able to erase a person's
 * writing.
 *
 * Everything else here is about the two things a foreign key cascade
 * cannot do -- the files in the bucket, and the counters cached on other
 * people's stories.
 */

export type StartResult =
  | { ok: true }
  | { ok: false; error: string };

/** Sends the code. Asking again replaces the one before it. */
export async function startDeletion(
  userId: string,
  email: string,
): Promise<StartResult> {
  const code = generateCode();

  await db
    .insert(accountDeletions)
    .values({
      userId,
      codeHash: hashCode(code),
      expires: new Date(Date.now() + TTL_MS),
      attempts: 0,
    })
    .onConflictDoUpdate({
      target: accountDeletions.userId,
      set: {
        codeHash: hashCode(code),
        expires: new Date(Date.now() + TTL_MS),
        attempts: 0,
        createdAt: new Date(),
      },
    });

  await send({
    to: email,
    subject: `${code} — confirm you want to delete your Wendfolk account`,
    text: [
      `Your code is ${code}.`,
      "",
      "It deletes your account, your stories, your trips and everything",
      "else, permanently. There is no undo and no copy kept.",
      "",
      "If you did not ask for this, ignore this email and change your",
      "password -- somebody else is signed in as you.",
    ].join("\n"),
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6;color:#191310">
        <p style="font-size:2rem;letter-spacing:0.2em;margin:0 0 1rem"><strong>${code}</strong></p>
        <p>This code deletes your account, your stories, your trips and
          everything else, <strong>permanently</strong>. There is no undo
          and no copy kept.</p>
        <p style="color:#6a5c50;font-size:0.875rem">If you did not ask for
          this, ignore this email and change your password — somebody else
          is signed in as you.</p>
      </div>`,
  });

  return { ok: true };
}

export type ConfirmResult = { ok: true } | { ok: false; error: string };

/**
 * Checks the code and, if it is right, erases everything.
 *
 * The attempt counter is spent before the comparison, so a wrong guess
 * costs one whether or not the request that made it completes.
 */
export async function confirmDeletion(
  userId: string,
  input: string,
): Promise<ConfirmResult> {
  const [request] = await db
    .select()
    .from(accountDeletions)
    .where(eq(accountDeletions.userId, userId))
    .limit(1);

  if (!request) {
    return { ok: false, error: "Ask for a code first." };
  }
  if (request.expires.getTime() < Date.now()) {
    await db.delete(accountDeletions).where(eq(accountDeletions.userId, userId));
    return { ok: false, error: "That code has expired. Ask for another." };
  }
  if (request.attempts >= MAX_ATTEMPTS) {
    await db.delete(accountDeletions).where(eq(accountDeletions.userId, userId));
    return { ok: false, error: "Too many attempts. Ask for a new code." };
  }

  await db
    .update(accountDeletions)
    .set({ attempts: request.attempts + 1 })
    .where(eq(accountDeletions.userId, userId));

  if (!codeMatches(normalizeCode(input), request.codeHash)) {
    return { ok: false, error: "That code is not right." };
  }

  await erase(userId);
  return { ok: true };
}

/**
 * The actual deletion.
 *
 * Order matters. The files go first: once the rows are gone there is
 * nothing left that knows which objects in the bucket were theirs, and
 * they would sit there, paid for, forever.
 */
async function erase(userId: string): Promise<void> {
  /*
   * Which stories other people own that this account has touched. Their
   * cached like and comment counts have to be rebuilt afterwards -- the
   * cascade removes the rows those numbers were counting and leaves the
   * numbers behind.
   */
  const touched = new Set<string>();
  for (const row of await db
    .select({ storyId: likes.storyId })
    .from(likes)
    .where(eq(likes.userId, userId))) {
    touched.add(row.storyId);
  }
  for (const row of await db
    .select({ storyId: comments.storyId })
    .from(comments)
    .where(eq(comments.authorId, userId))) {
    touched.add(row.storyId);
  }

  await purgeFiles(userId);

  // One delete; every foreign key above it is ON DELETE CASCADE.
  await db.delete(users).where(eq(users.id, userId));

  const remaining = [...touched];
  if (remaining.length > 0) {
    await db
      .update(stories)
      .set({
        likeCount: sql`(select count(*)::int from ${likes}
                        where ${likes.storyId} = ${stories.id})`,
        commentCount: sql`(select count(*)::int from ${comments}
                           where ${comments.storyId} = ${stories.id}
                             and ${comments.deletedAt} is null)`,
      })
      .where(inArray(stories.id, remaining));
  }
}

/**
 * Every object in the bucket this account owns.
 *
 * Three sources, because a key can be recorded in three places: a media
 * row for anything uploaded into a story, and the avatar and cover
 * columns on the profile, which have no media row at all.
 */
async function purgeFiles(userId: string): Promise<void> {
  const keys = new Set<string>();

  for (const m of await db
    .select({ key: media.storageKey })
    .from(media)
    .where(eq(media.ownerId, userId))) {
    keys.add(m.key);
  }

  for (const p of await db
    .select({ avatar: profiles.avatarKey, cover: profiles.coverKey })
    .from(profiles)
    .where(eq(profiles.userId, userId))) {
    if (p.avatar) keys.add(p.avatar);
    if (p.cover) keys.add(p.cover);
  }

  for (const key of keys) {
    try {
      await removeFromStorage(key);
    } catch (error) {
      /*
       * Logged, not raised. A file left behind is a few kilobytes and a
       * line in the sweep script's next run; refusing to delete somebody's
       * account because one object would not budge is a worse answer, and
       * in most places a legally wrong one.
       */
      console.error("[delete-account] could not remove", key, error);
    }
  }
}

/** What the confirmation screen lists, counted from the real rows. */
export async function deletionSummary(userId: string) {
  const [row] = await db
    .select({
      stories: sql<number>`(select count(*)::int from ${stories}
                            where ${stories.authorId} = ${userId})`,
      trips: sql<number>`(select count(*)::int from ${collections}
                          where ${collections.ownerId} = ${userId})`,
      comments: sql<number>`(select count(*)::int from ${comments}
                             where ${comments.authorId} = ${userId}
                               and ${comments.deletedAt} is null)`,
      photos: sql<number>`(select count(*)::int from ${media}
                           where ${media.ownerId} = ${userId})`,
      likesGiven: sql<number>`(select count(*)::int from ${likes}
                               where ${likes.userId} = ${userId})`,
      likesReceived: sql<number>`(select coalesce(sum(${stories.likeCount}), 0)::int
                                  from ${stories}
                                  where ${stories.authorId} = ${userId})`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row;
}

/**
 * Why this account cannot be deleted from the browser, if it cannot.
 *
 * Staff accounts are made on the server with `npm run admin:create` and
 * their powers are granted on the server with `npm run admin`. Removing
 * one belongs in the same place, for two reasons that have nothing to do
 * with protecting the person holding it:
 *
 *   - It erases who did what. `reports.resolved_by` and
 *     `notifications.actor_id` are ON DELETE SET NULL, so deleting a
 *     moderator quietly unsigns every decision they ever made.
 *   - An admin who deletes the only account that can work the queue
 *     leaves nobody able to act on anything, and the way back is a
 *     command on the server anyway.
 *
 * The way out is one command: demote it to a reader, and it becomes an
 * ordinary account that can close itself like any other.
 */
export async function deletionBlock(userId: string): Promise<string | null> {
  const [me] = await db
    .select({ role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!me || me.role === "user") return null;

  return (
    `This is a staff account, and deleting it would unsign every ` +
    `moderation decision it has made. Demote it first, on the server:\n\n` +
    `    npm run admin -- ${me.email ?? "its-email"} user`
  );
}
