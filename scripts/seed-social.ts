// Env comes from --env-file (see the npm script).
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  collections,
  collectionStories,
  comments,
  likes,
  profiles,
  stories,
  storyTags,
  tags,
  users,
} from "../lib/db/schema";
import { slugify } from "../lib/slug";
import { parseTags, setStoryTags } from "../lib/tags";
import { SEED_DOMAIN } from "./seed-config";
import { requireLocalDatabase } from "./guard";

/**
 * Gives the seeded stories likes, comments and tags.
 *
 * Without these, every list on the site shows "0 likes", the tag filter row
 * is empty and the comment section is a form with nothing under it -- so
 * none of the three features can actually be looked at. Separate from
 * `npm run seed` so it can run against an existing database, same as
 * seed:auth and seed:avatars.
 *
 * `--clear` removes all of it again.
 */
const CLEAR = process.argv.includes("--clear");

/**
 * Tags by subject, chosen per story rather than at random: the point of the
 * filter row is that "food" returns food writing, and a shuffle would make
 * the feature look like it does not work.
 */
const TAGS: Record<string, string> = {
  "The Wedding I Wasn't Invited To": "people, food",
  "Learning to Fry Plantain Properly, at Forty-One": "food, people",
  "Eleven Days Down the Coast": "road trip, solo",
  "Sunday Lunch in Naples, Four Hours Long": "food, people",
  "A Week of Trains and the People on Them": "by train, people",
  "The Best Meal of My Life Was in a Bus Station": "food, solo",
  "Nine Strangers and a Broken Down Bus": "by train, people",
  "Five of Us in a Bothy in the Rain": "hiking, people",
  "The Man Who Walked With Me for Six Miles": "hiking, solo",
  "The Ajumma Who Adopted Me for a Day": "food, people",
  "Watching the Sunrise with Forty Strangers": "hiking, solo",
  "The Fisherman Who Made Me Lunch": "people, food",
  "A Card Game on the East Sea": "by train, people",
  "The Slow Road to Kotor": "slow travel, by train",
  "Three Days in Málaga": "slow travel, solo",
};

/**
 * Written as the seeded writers, about the seeded stories, because that is
 * what they are for. Keyed by story so a re-run is idempotent rather than
 * stacking a second copy of the same conversation.
 */
const THREADS: Record<string, { by: string; says: string; replies?: { by: string; says: string }[] }[]> = {
  "Eleven Days Down the Coast": [
    {
      by: "tomas",
      says: "Eleven days sounds slow until you try it. I did half this route in two and saw none of it.",
      replies: [
        { by: "mira", says: "That was rather the point. The bits I remember are all the ones I nearly skipped." },
      ],
    },
    { by: "seokjin", says: "The receipt detail is the whole story. Everything good I have done started like that." },
  ],
  "Sunday Lunch in Naples, Four Hours Long": [
    {
      by: "ellis",
      says: "Four hours is not a long lunch in Naples, it is a normal one. Took me three visits to stop checking the time.",
      replies: [{ by: "nadia", says: "The nine-year-old was the one keeping me there, honestly." }],
    },
  ],
  "The Ajumma Who Adopted Me for a Day": [
    { by: "mira", says: "Jagalchi will do this to you. I asked one question about crab and lost an afternoon." },
  ],
  "Five of Us in a Bothy in the Rain": [
    { by: "tomas", says: "Sourlies in the rain is a particular kind of commitment. Respect." },
  ],
};

/**
 * Trips, as ordered runs of one writer's stories.
 *
 * Keyed by the owner's handle. The order in the array is the order on the
 * page, which is the whole point of the feature.
 */
const TRIPS: {
  by: string;
  title: string;
  description: string;
  stories: string[];
}[] = [
  {
    by: "mira",
    title: "West Africa by road",
    description:
      "Accra to Ouidah without flying, and the people who turned out to be the reason for it.",
    stories: [
      "The Wedding I Wasn't Invited To",
      "Eleven Days Down the Coast",
      "Learning to Fry Plantain Properly, at Forty-One",
    ],
  },
  {
    by: "ellis",
    title: "Wet weeks in the hills",
    description: "Two ranges, four days of rain, and better company than the forecast deserved.",
    stories: [
      "Five of Us in a Bothy in the Rain",
      "The Man Who Walked With Me for Six Miles",
    ],
  },
];

/** Likes, per story, as a count of seeded readers rather than a flat number. */
const LIKES: Record<string, number> = {
  "Eleven Days Down the Coast": 4,
  "Sunday Lunch in Naples, Four Hours Long": 5,
  "The Ajumma Who Adopted Me for a Day": 3,
  "The Wedding I Wasn't Invited To": 4,
  "The Best Meal of My Life Was in a Bus Station": 3,
  "Five of Us in a Bothy in the Rain": 2,
  "Three Days in Málaga": 1,
  "The Slow Road to Kotor": 2,
};

async function clear() {
  const seeded = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `%${SEED_DOMAIN}`));
  const ids = seeded.map((u) => u.id);

  if (ids.length > 0) {
    await db.delete(comments).where(inArray(comments.authorId, ids));
    await db.delete(likes).where(inArray(likes.userId, ids));
  }

  // Tags themselves go too: nothing else creates them, so leaving the rows
  // would leave a filter row full of tags no story wears.
  await db.delete(storyTags);
  await db.delete(tags);

  if (ids.length > 0) {
    // collection_stories goes with it by cascade.
    await db.delete(collections).where(inArray(collections.ownerId, ids));
  }

  await db.update(stories).set({ likeCount: 0, commentCount: 0 });
  console.log(
    `  cleared likes, comments and trips from ${ids.length} seeded accounts, and all tags`,
  );
}

async function main() {
  requireLocalDatabase("seed:social");

  if (CLEAR) {
    await clear();
    process.exit(0);
  }

  const rows = await db
    .select({ id: stories.id, title: stories.title, authorId: stories.authorId })
    .from(stories)
    .where(sql`${stories.status} = 'published'`);

  const people = await db
    .select({ userId: profiles.userId, handle: profiles.handle })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(like(users.email, `%${SEED_DOMAIN}`));

  const byHandle = new Map(people.map((p) => [p.handle, p.userId]));
  if (people.length === 0) {
    console.log("  No seeded accounts found. Run `npm run seed` first.");
    process.exit(0);
  }

  let tagged = 0;
  let liked = 0;
  let said = 0;

  for (const story of rows) {
    const tagInput = TAGS[story.title];
    if (tagInput) {
      await setStoryTags(story.id, parseTags(tagInput));
      tagged++;
    }

    /*
     * Likes come from the writers who did not write it -- an author liking
     * their own story is allowed by the schema and would look like padding
     * in a seed.
     */
    const wanted = LIKES[story.title] ?? 0;
    const readers = people.filter((p) => p.userId !== story.authorId).slice(0, wanted);
    if (readers.length > 0) {
      await db
        .insert(likes)
        .values(readers.map((r) => ({ storyId: story.id, userId: r.userId })))
        .onConflictDoNothing();
      liked += readers.length;
    }

    for (const thread of THREADS[story.title] ?? []) {
      const authorId = byHandle.get(thread.by);
      if (!authorId) continue;

      // Checked rather than deleted first, so a re-run adds nothing and
      // removes nothing.
      const [exists] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(sql`${comments.storyId} = ${story.id} and ${comments.body} = ${thread.says}`)
        .limit(1);
      if (exists) continue;

      const [root] = await db
        .insert(comments)
        .values({ storyId: story.id, authorId, body: thread.says })
        .returning({ id: comments.id });
      said++;

      for (const reply of thread.replies ?? []) {
        const replyAuthor = byHandle.get(reply.by);
        if (!replyAuthor) continue;
        await db.insert(comments).values({
          storyId: story.id,
          authorId: replyAuthor,
          body: reply.says,
          parentId: root.id,
        });
        said++;
      }
    }
  }

  // The cached counters, rebuilt from the rows in one pass -- the same
  // recount the live code does, applied to everything at once.
  await db.update(stories).set({
    likeCount: sql`(select count(*)::int from ${likes} where ${likes.storyId} = ${stories.id})`,
    commentCount: sql`(select count(*)::int from ${comments}
                       where ${comments.storyId} = ${stories.id}
                         and ${comments.deletedAt} is null)`,
  });

  /*
   * Trips last: they reference stories by title, so everything else has
   * to exist first. Skipped rather than duplicated when one already has
   * the name, so a re-run is idempotent.
   */
  let trips = 0;
  for (const trip of TRIPS) {
    const ownerId = byHandle.get(trip.by);
    if (!ownerId) continue;

    const slug = slugify(trip.title);
    const [exists] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.ownerId, ownerId), eq(collections.slug, slug)))
      .limit(1);
    if (exists) continue;

    const [made] = await db
      .insert(collections)
      .values({
        ownerId,
        slug,
        title: trip.title,
        description: trip.description,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: collections.id });

    const members = trip.stories
      .map((title, position) => {
        const story = rows.find((r) => r.title === title && r.authorId === ownerId);
        return story ? { collectionId: made.id, storyId: story.id, position } : null;
      })
      .filter((m) => m !== null);

    if (members.length > 0) {
      await db.insert(collectionStories).values(members).onConflictDoNothing();
      trips++;
    }
  }

  console.log(
    `  ${tagged} stories tagged, ${liked} likes, ${said} comments, ${trips} trips`,
  );
  process.exit(0);
}

main();
