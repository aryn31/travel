import { and, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { profiles, storyTags, stories, tags } from "./db/schema";

/**
 * What a story is about, as distinct from where it happened.
 *
 * Place already has two levels of its own, and a second taxonomy answering
 * the same question would only be a worse country filter. These are kinds
 * of travel -- solo, food, hiking, by train -- so a reader who wants food
 * writing can find it in a country they have never heard of.
 */

export {
  MAX_PER_STORY,
  MAX_LABEL,
  parseTags,
  tagsToInput,
  type StoryTag,
} from "./tags-rules";
import type { StoryTag } from "./tags-rules";

export async function tagsForStory(storyId: string): Promise<StoryTag[]> {
  return db
    .select({ slug: tags.slug, label: tags.label })
    .from(storyTags)
    .innerJoin(tags, eq(tags.id, storyTags.tagId))
    .where(eq(storyTags.storyId, storyId))
    .orderBy(tags.label);
}

/** Every story's tags in one query, for a list page. */
export async function tagsForStories(
  storyIds: string[],
): Promise<Map<string, StoryTag[]>> {
  const map = new Map<string, StoryTag[]>();
  if (storyIds.length === 0) return map;

  const rows = await db
    .select({ storyId: storyTags.storyId, slug: tags.slug, label: tags.label })
    .from(storyTags)
    .innerJoin(tags, eq(tags.id, storyTags.tagId))
    .where(inArray(storyTags.storyId, storyIds))
    .orderBy(tags.label);

  for (const r of rows) {
    const list = map.get(r.storyId);
    if (list) list.push({ slug: r.slug, label: r.label });
    else map.set(r.storyId, [{ slug: r.slug, label: r.label }]);
  }
  return map;
}

/**
 * Replaces a story's tags with exactly this list.
 *
 * Tags themselves are created on demand and never deleted here: another
 * story may be using one, and an unused tag row is a few bytes against the
 * risk of removing one out from under someone mid-save. The sweep for those
 * belongs with the media sweep, not on the autosave path.
 */
export async function setStoryTags(
  storyId: string,
  wanted: StoryTag[],
): Promise<void> {
  if (wanted.length === 0) {
    await db.delete(storyTags).where(eq(storyTags.storyId, storyId));
    return;
  }

  await db
    .insert(tags)
    .values(wanted.map((t) => ({ slug: t.slug, label: t.label })))
    /*
     * Two writers tagging "food" at the same moment both try to create it.
     * The unique slug makes the loser's insert a conflict rather than a
     * duplicate, and the row it wanted is already there.
     */
    .onConflictDoNothing({ target: tags.slug });

  const rows = await db
    .select({ id: tags.id, slug: tags.slug })
    .from(tags)
    .where(inArray(tags.slug, wanted.map((t) => t.slug)));

  const keep = rows.map((r) => r.id);

  await db.transaction(async (tx) => {
    // Only the ones being dropped. Deleting every row and re-inserting would
    // churn the whole join table on every autosave.
    await tx
      .delete(storyTags)
      .where(
        and(eq(storyTags.storyId, storyId), notInArray(storyTags.tagId, keep)),
      );

    await tx
      .insert(storyTags)
      .values(keep.map((tagId) => ({ storyId, tagId })))
      .onConflictDoNothing();
  });
}

/**
 * Tags in use, with counts, for the filter row.
 *
 * Respects the search terms but ignores the selected tag, so picking one
 * does not collapse the row that picked it -- the same rule the country and
 * city facets follow.
 */
export type TagFacet = { slug: string; label: string; count: number };

export async function tagFacets(
  where: SQL,
  withAuthor = false,
): Promise<TagFacet[]> {
  const base = db
    .select({
      slug: tags.slug,
      label: tags.label,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(storyTags)
    .innerJoin(tags, eq(tags.id, storyTags.tagId))
    .innerJoin(stories, eq(stories.id, storyTags.storyId));

  // Only joined when the condition actually reads it -- see tagFacetsFor.
  const scoped = withAuthor
    ? base.innerJoin(profiles, eq(profiles.userId, stories.authorId))
    : base;

  return scoped
    .where(where)
    .groupBy(tags.slug, tags.label)
    .orderBy(sql`count(*) desc`, tags.label)
    .limit(16);
}

/**
 * The tags already in use, most used first, for the editor's suggestions.
 *
 * Offering what exists is what keeps the vocabulary from forking into
 * "food", "foods" and "eating" -- the same argument as the place field's
 * autocomplete, for the same reason.
 */
export async function popularTags(limit = 12): Promise<StoryTag[]> {
  return db
    .select({ slug: tags.slug, label: tags.label })
    .from(storyTags)
    .innerJoin(tags, eq(tags.id, storyTags.tagId))
    .innerJoin(stories, eq(stories.id, storyTags.storyId))
    .where(sql`${stories.status} = 'published' and ${stories.removedAt} is null`)
    .groupBy(tags.slug, tags.label)
    .orderBy(sql`count(*) desc`, tags.label)
    .limit(limit);
}
