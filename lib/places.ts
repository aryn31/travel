import { sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { stories } from "./db/schema";

/**
 * The places writers have already named, offered back to the next writer.
 *
 * `stories.place_name` is free text, so "Naples", "naples" and "Naples,
 * Italy" are three different cities to every filter on the site. Validation
 * is the wrong fix -- a story can legitimately happen somewhere no gazetteer
 * lists -- so instead a place is identified by its lowercased name
 * everywhere, the field suggests what is already there, and saving snaps to
 * the spelling already in use.
 */
export type PlaceSuggestion = {
  name: string;
  countryCode: string | null;
  count: number;
};

/**
 * The spelling to show for a group of case variants.
 *
 * `min()` was the obvious choice and the wrong one: under this database's
 * collation min() over {"Naples", "naples"} returns "naples", so a single
 * careless story would rename the city in the filter row, in the
 * suggestions, and on every card. Measured, not assumed -- the default
 * collation sorts lowercase first, and the C collation sorts "NAPLES"
 * first, so neither picks the spelling a reader wants.
 *
 * In order of preference: starts with a capital, is not shouting in full
 * caps, then alphabetical so the result never depends on row order.
 */
export const canonicalName: SQL<string> = sql`(array_agg(
  ${stories.placeName}
  order by
    (${stories.placeName} ~ '^[[:upper:]]') desc,
    (${stories.placeName} = upper(${stories.placeName})) asc,
    ${stories.placeName}
))[1]`;

/** Non-empty place names on published stories. */
export const hasPlace: SQL = sql`${stories.placeName} is not null
  and ${stories.placeName} <> ''`;

/**
 * Capped, and sent to the browser whole: the list is small, the editor
 * filters it as you type, and a per-keystroke round trip to Supabase would
 * be slower and more code for a field most people fill in once.
 *
 * Published only. Drafts are private, and a place name is still something
 * its author has not chosen to publish yet.
 */
export async function knownPlaces(limit = 300): Promise<PlaceSuggestion[]> {
  return db
    .select({
      name: sql<string>`${canonicalName}`.as("name"),
      countryCode: stories.countryCode,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(stories)
    .where(sql`${stories.status} = 'published' and ${stories.removedAt} is null and ${hasPlace}`)
    /*
     * By country as well as by name: Naples in Italy and Naples in Florida
     * are two places that happen to share a word, and merging them would
     * offer the writer one suggestion with whichever flag won a coin toss.
     */
    .groupBy(sql`lower(${stories.placeName})`, stories.countryCode)
    .orderBy(sql`count(*) desc`, sql`${canonicalName} asc`)
    .limit(limit);
}

/**
 * The spelling this place already goes by, if it goes by one.
 *
 * Called on save so that typing "naples" where everyone else wrote "Naples"
 * stores "Naples". Matching case-insensitively is enough to make the
 * filters agree; snapping the stored value is what makes the story's own
 * page, its card and its chip agree too.
 */
export async function canonicalPlaceName(typed: string): Promise<string> {
  const name = typed.trim();
  if (!name) return name;

  const [row] = await db
    .select({ name: sql<string>`${canonicalName}` })
    .from(stories)
    .where(
      sql`${stories.status} = 'published' and ${stories.removedAt} is null
          and lower(${stories.placeName}) = lower(${name})`,
    )
    .groupBy(sql`lower(${stories.placeName})`)
    .limit(1);

  // Nothing published there yet: the writer's spelling becomes the one.
  return row?.name ?? name;
}
