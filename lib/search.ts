import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { media, profiles, stories } from "./db/schema";
import { publicUrl } from "./storage";
import type { StoryCard } from "@/components/StoryList";

export const PAGE_SIZE = 12;

export const SORTS = ["relevant", "recent", "longest"] as const;
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

export type Snippet = { text: string; hit: boolean }[];

export type SearchResult = StoryCard & { snippet: Snippet | null };

export type Query = {
  q: string;
  country: string | null;
  sort: Sort;
  page: number;
};

/** Reads and clamps the query string. Anything unrecognised falls back. */
export function parseQuery(sp: Record<string, string | string[] | undefined>): Query {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || "";

  const q = one(sp.q).slice(0, 120);
  const country = one(sp.country).toUpperCase().slice(0, 2) || null;
  const page = Math.max(1, Math.min(500, Number(one(sp.page)) || 1));

  const asked = one(sp.sort) as Sort;
  const fallback: Sort = q ? "relevant" : "recent";
  let sort = SORTS.includes(asked) ? asked : fallback;
  // Relevance is meaningless with no terms to be relevant to, so an empty
  // box sorts by date however the URL was written.
  if (!q && sort === "relevant") sort = "recent";

  return { q, country, sort, page };
}

/** Escapes the LIKE wildcards so a literal % in a search box means "%". */
function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Matches the story or its author. Both sides have their own indexed
 * tsvector -- a generated column cannot read across a join, so the author
 * half lives on `profiles` -- and every query here joins the two.
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
  )`;
}

function conditions(query: Query) {
  const where: SQL[] = [sql`${stories.status} = 'published'`];
  if (query.q) where.push(matches(query.q));
  if (query.country) where.push(sql`${stories.countryCode} = ${query.country}`);
  return and(...where)!;
}

/** Splits a ts_headline result into plain and highlighted runs. */
function toSnippet(headline: string | null): Snippet | null {
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

  // ts_headline cuts at a word count, so a fragment normally stops mid
  // sentence with no sign that it did.
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
  )`;

  const order = {
    relevant: sql`${rank} desc, ${stories.publishedAt} desc nulls last`,
    recent: sql`${stories.publishedAt} desc nulls last`,
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
      publishedAt: stories.publishedAt,
      placeName: stories.placeName,
      countryCode: stories.countryCode,
      handle: profiles.handle,
      displayName: profiles.displayName,
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

  const results: SearchResult[] = rows.map((r) => ({
    ...r,
    cover: r.coverKey
      ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
      : null,
    snippet: toSnippet(r.headline),
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
      bio: profiles.bio,
      stories: sql<number>`count(${stories.id})::int`.as("stories"),
    })
    .from(profiles)
    .innerJoin(
      stories,
      sql`${stories.authorId} = ${profiles.userId} and ${stories.status} = 'published'`,
    )
    .where(
      sql`(
        ${profiles.searchVector} @@ ${tsq}
        or ${profiles.displayName} ilike ${like}
        or ${profiles.handle} ilike ${like}
      )`,
    )
    .groupBy(profiles.handle, profiles.displayName, profiles.bio)
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
  const where: SQL[] = [sql`${stories.status} = 'published'`];
  if (query.q) where.push(matches(query.q));
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

/** Builds a /stories URL, dropping defaults so the common case stays clean. */
export function storiesHref(
  query: Query,
  patch: Partial<Query> & { page?: number | null },
) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.country) params.set("country", next.country);
  const defaultSort: Sort = next.q ? "relevant" : "recent";
  if (next.sort !== defaultSort) params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));

  const s = params.toString();
  return s ? `/stories?${s}` : "/stories";
}
