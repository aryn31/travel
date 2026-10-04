import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { media, profiles, stories } from "./db/schema";
import { publicUrl } from "./storage";
import type { StoryCard } from "@/components/StoryList";
import { storyTags, tags } from "./db/schema";
import { canonicalName, hasPlace } from "./places";
import { tagFacets, tagsForStories, type StoryTag } from "./tags";

export const PAGE_SIZE = 12;

export const SORTS = ["relevant", "recent", "liked", "longest"] as const;
export type Sort = (typeof SORTS)[number];

/*
 * ts_headline wraps the matched words in these. Control characters rather
 * than something like <b> or «»: the snippet is split on them and rendered
 * as React elements, so a story that happens to contain the delimiter would
 * otherwise draw a highlight of its own.
 */
const SEL_START = "\u0001";
const SEL_STOP = "\u0002";
const HEADLINE_OPTS =
  `StartSel=${SEL_START},StopSel=${SEL_STOP},` +
  "MaxFragments=1,MaxWords=32,MinWords=20,FragmentDelimiter= … ";

/**
 * What a tag match is worth against a text match.
 *
 * Calibrated rather than guessed: ts_rank returns roughly 0.06 for a single
 * weight-A hit, so a tag is worth a little more than one mention of the
 * word and a good deal less than a story actually about it. Tagging is a
 * deliberate act by the writer, which is why it counts for more than a
 * passing reference -- but a story titled "Food" should still win.
 */
/* Inlined as a literal, not bound as a parameter: next to `else 0`
   Postgres infers the parameter's type as integer and rejects 0.08 with
   "invalid input syntax for type integer". Safe to inline -- it is this
   constant, never user input. */
const TAG_BONUS = sql.raw("0.08::float8");

export type Snippet = { text: string; hit: boolean }[];

export type SearchResult = StoryCard & {
  snippet: Snippet | null;
  likeCount: number;
  commentCount: number;
  /**
   * Shown on the result, not just on the story. A search for "hiking"
   * returns stories that never use the word -- the tag is the only reason
   * they are there, so it has to be visible or the results look arbitrary.
   */
  tags: StoryTag[];
};

export type Query = {
  q: string;
  country: string | null;
  /*
   * The city, held as the place name a writer typed rather than as an id.
   * `stories.place_name` is free text -- the places table is phase 2 -- so
   * "Naples" is both the label and the key, and matching is case
   * insensitive because the two writers who name a city rarely capitalise
   * it the same way.
   */
  city: string | null;
  /** A tag slug. What the story is about, as opposed to where it happened. */
  tag: string | null;
  sort: Sort;
  page: number;
};

/** Reads and clamps the query string. Anything unrecognised falls back. */
export function parseQuery(sp: Record<string, string | string[] | undefined>): Query {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || "";

  const q = one(sp.q).slice(0, 120);
  const country = one(sp.country).toUpperCase().slice(0, 2) || null;
  const city = one(sp.city).slice(0, 80) || null;
  const tag = one(sp.tag).toLowerCase().slice(0, 60) || null;
  const page = Math.max(1, Math.min(500, Number(one(sp.page)) || 1));

  const asked = one(sp.sort) as Sort;
  const fallback: Sort = q ? "relevant" : "recent";
  let sort = SORTS.includes(asked) ? asked : fallback;
  // Relevance is meaningless with no terms to be relevant to, so an empty
  // box sorts by date however the URL was written.
  if (!q && sort === "relevant") sort = "recent";

  return { q, country, city, tag, sort, page };
}

/** Escapes the LIKE wildcards so a literal % in a search box means "%". */
function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Stories carrying a tag that matches the search terms.
 *
 * Tags cannot live in `stories.search_vector`: a generated column is
 * computed from its own row and cannot read across a join. So they are
 * matched the same way the author half is -- as a separate condition OR'd
 * into the whole.
 *
 * Aliased st/t deliberately. This lands inside tagFacets, whose own FROM
 * already names `story_tags` and `tags`; without the aliases the inner
 * references would bind to the outer query.
 */
function taggedMatching(q: string): SQL {
  const tsq = sql`websearch_to_tsquery('english', ${q})`;
  const like = likePattern(q);
  return sql`exists (
    select 1 from ${storyTags} as st
    join ${tags} as t on t.id = st.tag_id
    where st.story_id = ${stories.id}
      and (
        to_tsvector('english', t.label) @@ ${tsq}
        or t.label ilike ${like}
        -- The slug too, so "by-train" finds what "by train" finds.
        or t.slug ilike ${like}
      )
  )`;
}

/**
 * Matches the story, its author, or its tags. Each has its own way of being
 * indexed -- a generated tsvector on `stories`, another on `profiles`, and
 * a join for tags -- and every query here can reach all three.
 */
function matches(q: string): SQL {
  const tsq = sql`websearch_to_tsquery('english', ${q})`;
  const like = likePattern(q);
  /*
   * Full text first, then plain substring matches as a safety net.
   * to_tsquery only matches whole lexemes, so "Napl" finds nothing at all --
   * which reads as a broken search box to anyone typing a place or a name
   * they are unsure how to spell. The handle needs it most: "Seok-jin Park"
   * indexes as three lexemes, so the handle "seokjin" matches none of them.
   */
  return sql`(
    ${stories.searchVector} @@ ${tsq}
    or ${profiles.searchVector} @@ ${tsq}
    or ${stories.title} ilike ${like}
    or ${stories.placeName} ilike ${like}
    or ${profiles.displayName} ilike ${like}
    or ${profiles.handle} ilike ${like}
    or ${taggedMatching(q)}
  )`;
}

/** Free text, so matched the way the city filter is: case insensitively. */
function inCity(city: string): SQL {
  return sql`lower(${stories.placeName}) = lower(${city})`;
}

/**
 * An EXISTS rather than a join: joining story_tags would multiply a story
 * by its tag count, and every count on the page would be wrong for
 * anything wearing more than one.
 */
function taggedWith(slug: string): SQL {
  return sql`exists (
    select 1 from ${storyTags}
    join ${tags} on ${tags.id} = ${storyTags.tagId}
    where ${storyTags.storyId} = ${stories.id} and ${tags.slug} = ${slug}
  )`;
}

function conditions(query: Query) {
  const where: SQL[] = [sql`${stories.status} = 'published' and ${stories.removedAt} is null`];
  if (query.q) where.push(matches(query.q));
  if (query.country) where.push(sql`${stories.countryCode} = ${query.country}`);
  if (query.city) where.push(inCity(query.city));
  if (query.tag) where.push(taggedWith(query.tag));
  return and(...where)!;
}

/**
 * Splits a ts_headline result into plain and highlighted runs.
 *
 * `body` is only read to decide whether the fragment starts at the
 * beginning of the story. ts_headline cuts at a word count from wherever
 * the match is, so a snippet normally opens mid-sentence with nothing to
 * say so -- which reads as a truncated first paragraph rather than as an
 * extract from the middle.
 */
function toSnippet(headline: string | null, body: string): Snippet | null {
  if (!headline) return null;

  const out: Snippet = [];
  for (const chunk of headline.split(SEL_START)) {
    const [hit, ...rest] = chunk.split(SEL_STOP);
    // The first chunk has no start marker, so it is all plain text.
    if (rest.length === 0) {
      if (hit) out.push({ text: hit, hit: false });
      continue;
    }
    if (hit) out.push({ text: hit, hit: true });
    const tail = rest.join(SEL_STOP);
    if (tail) out.push({ text: tail, hit: false });
  }
  if (out.length === 0) return null;

  const first = out[0];
  if (!body.trimStart().startsWith(first.text.trimStart().slice(0, 24))) {
    // The marker goes in its own run so it is never inside a <mark>: the
    // ellipsis is the renderer's, not one of the words Postgres matched.
    out.unshift({ text: "… ", hit: false });
  }

  // The same at the other end, where the fragment stops mid sentence with
  // no sign that it did.
  const last = out[out.length - 1];
  if (!/[.!?…"”]\s*$/.test(last.text)) {
    out.push({ text: last.hit ? " …" : "…", hit: false });
  }
  return out;
}

export async function searchStories(query: Query) {
  const where = conditions(query);
  const tsq = sql`websearch_to_tsquery('english', ${query.q})`;

  /*
   * Story text and author name are ranked together, the author discounted:
   * searching a name should surface that writer's work, but a story that is
   * actually about the word still deserves to come first.
   *
   * Matches found only by ilike rank 0 and fall to the bottom, which is
   * where a substring hit belongs next to a real lexeme match.
   */
  const rank = sql`(
    ts_rank(${stories.searchVector}, ${tsq})
    + 0.4 * ts_rank(${profiles.searchVector}, ${tsq})
    + case when ${taggedMatching(query.q)} then ${TAG_BONUS} else 0 end
  )`;

  const order = {
    relevant: sql`${rank} desc, ${stories.publishedAt} desc nulls last`,
    recent: sql`${stories.publishedAt} desc nulls last`,
    liked: sql`${stories.likeCount} desc, ${stories.publishedAt} desc nulls last`,
    longest: sql`${stories.readingMinutes} desc, ${stories.publishedAt} desc nulls last`,
  }[query.sort];

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      excerpt: stories.excerpt,
      bodyText: stories.bodyText,
      readingMinutes: stories.readingMinutes,
      likeCount: stories.likeCount,
      commentCount: stories.commentCount,
      publishedAt: stories.publishedAt,
      placeName: stories.placeName,
      countryCode: stories.countryCode,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
      coverKey: media.storageKey,
      coverWidth: media.width,
      coverHeight: media.height,
      headline: query.q
        ? sql<string>`ts_headline('english', ${stories.bodyText}, ${tsq}, ${HEADLINE_OPTS})`
        : sql<string | null>`null::text`,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(where)
    .orderBy(order)
    .limit(PAGE_SIZE)
    .offset((query.page - 1) * PAGE_SIZE);

  // The join is not optional here: the match condition reads the author's
  // search vector, so counting without it is a missing-FROM-entry error.
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(where);

  // One query for the page's tags rather than one per result.
  const tagsById = await tagsForStories(rows.map((r) => r.id));

  const results: SearchResult[] = rows.map((r) => ({
    ...r,
    cover: r.coverKey
      ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
      : null,
    snippet: toSnippet(r.headline, r.bodyText),
    tags: tagsById.get(r.id) ?? [],
  }));

  return { results, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/**
 * Writers whose own name or handle matched, so the page can offer them
 * directly rather than only as the byline under a story. Someone typing a
 * name usually wants the person, not one piece they wrote.
 */
export async function matchingWriters(query: Query) {
  if (!query.q) return [];

  const tsq = sql`websearch_to_tsquery('english', ${query.q})`;
  const like = likePattern(query.q);

  return db
    .select({
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
      bio: profiles.bio,
      stories: sql<number>`count(${stories.id})::int`.as("stories"),
    })
    .from(profiles)
    .innerJoin(
      stories,
      sql`${stories.authorId} = ${profiles.userId} and ${stories.status} = 'published' and ${stories.removedAt} is null`,
    )
    .where(
      sql`(
        ${profiles.searchVector} @@ ${tsq}
        or ${profiles.displayName} ilike ${like}
        or ${profiles.handle} ilike ${like}
      )`,
    )
    .groupBy(profiles.handle, profiles.displayName, profiles.avatarKey, profiles.bio)
    .orderBy(sql`count(${stories.id}) desc`)
    .limit(4);
}

/**
 * Countries to offer as filters, with their counts. Deliberately unfiltered
 * by the current country so the chip row does not collapse to one entry the
 * moment a filter is applied -- but it does respect the search terms, so
 * the counts describe what is actually reachable.
 */
export async function countryFacets(query: Query) {
  const where: SQL[] = [sql`${stories.status} = 'published' and ${stories.removedAt} is null`];
  if (query.q) where.push(matches(query.q));
  /* The tag narrows this row; the country and city deliberately do not.
     Applying the country would collapse the row to the one chip already
     chosen, and the city implies its own country. */
  if (query.tag) where.push(taggedWith(query.tag));
  where.push(sql`${stories.countryCode} is not null`);

  return db
    .select({
      code: sql<string>`${stories.countryCode}`.as("code"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(and(...where)!)
    .groupBy(stories.countryCode)
    .orderBy(sql`count(*) desc`, sql`${stories.countryCode} asc`);
}

/**
 * Cities to offer, with their counts.
 *
 * Only once a country or a search has narrowed things down. Shown on a
 * bare archive it was a second row of chips mostly reading "1", below a
 * row of countries that already said the same thing -- noise in the place
 * where a reader is deciding where to start.
 *
 * Like countryFacets it ignores the current city, so picking one does not
 * collapse the row that picked it.
 */
export async function cityFacets(query: Query) {
  if (!query.country && !query.q) return [];

  const where: SQL[] = [sql`${stories.status} = 'published' and ${stories.removedAt} is null`];
  if (query.q) where.push(matches(query.q));
  if (query.country) where.push(sql`${stories.countryCode} = ${query.country}`);
  if (query.tag) where.push(taggedWith(query.tag));
  where.push(hasPlace);

  return db
    .select({
      // Grouped case insensitively so "naples" and "Naples" are one city,
      // and labelled by the rule in lib/places.ts -- min() would have
      // picked the lowercase one.
      name: sql<string>`${canonicalName}`.as("name"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(and(...where)!)
    .groupBy(sql`lower(${stories.placeName})`)
    .orderBy(sql`count(*) desc`, sql`${canonicalName} asc`)
    .limit(12);
}

/**
 * Tags in use, with counts.
 *
 * Respects the search terms and the place filters but ignores the selected
 * tag, so picking one does not collapse the row that picked it -- the same
 * rule the country and city facets follow.
 */
export async function tagFacetsFor(query: Query) {
  const where: SQL[] = [sql`${stories.status} = 'published' and ${stories.removedAt} is null`];
  if (query.q) where.push(matches(query.q));
  if (query.country) where.push(sql`${stories.countryCode} = ${query.country}`);
  if (query.city) where.push(inCity(query.city));

  /*
   * The author join only matters when there are search terms -- `matches`
   * reads the author's search vector, and without the join that is a
   * missing-FROM-entry error.
   */
  return tagFacets(and(...where)!, Boolean(query.q));
}

/** Builds a /stories URL, dropping defaults so the common case stays clean. */
export function storiesHref(
  query: Query,
  patch: Partial<Query> & { page?: number | null },
) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.country) params.set("country", next.country);
  if (next.city) params.set("city", next.city);
  if (next.tag) params.set("tag", next.tag);
  const defaultSort: Sort = next.q ? "relevant" : "recent";
  if (next.sort !== defaultSort) params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));

  const s = params.toString();
  return s ? `/stories?${s}` : "/stories";
}
