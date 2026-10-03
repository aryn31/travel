import Link from "next/link";
import { excerpt } from "@/lib/story-doc";
import { Avatar } from "@/components/ui/Avatar";
import { PlaceMark } from "@/components/ui/PlaceMark";
import { TagChip } from "@/components/ui/TagChip";
import { Highlighted } from "./Highlighted";
import {
  PAGE_SIZE,
  storiesHref,
  type Query,
  type SearchResult,
  type Sort,
} from "@/lib/search";

/*
 * What the lead is the top of. With a query it is the best match; with only
 * a country filter nothing has been ranked, and calling the newest story in
 * Italy the "best match" for a search nobody ran is simply untrue.
 */
const LEAD_LABEL: Record<Sort, string> = {
  relevant: "Best match",
  recent: "Newest",
  liked: "Most liked",
  longest: "Longest read",
};

/**
 * The search view: size follows rank.
 *
 * A search has an answer, and twelve identical cards refused to say what it
 * was -- the best match and the twelfth were the same shape, so the ranking
 * the query went to the trouble of computing was invisible. Here the top
 * result gets a poster and everything else gets a numbered row.
 *
 * There was a tier of cards between the two. It earned its place on a
 * search page and nowhere else: three sizes down one page is a lot of
 * hierarchy for a list, and the middle one mostly said "these three happen
 * to be second".
 *
 * The order is never rearranged, which is why this and not the atlas is the
 * layout for a query: grouping by country would scramble relevance, and the
 * one thing a result list must not do is lie about what came first.
 */
export function EditorialResults({
  results,
  page,
  sort,
  query,
}: {
  results: SearchResult[];
  page: number;
  sort: Sort;
  /** Carried down so every place mark can narrow to its own city. */
  query: Query;
}) {
  /*
   * Only the first page has a lead. The thirteenth-best match given a
   * poster and the word "top" over it would be a straightforward untruth.
   */
  const lead = page === 1 ? results[0] : null;
  const rest = lead ? results.slice(1) : results;

  // Continuous down the whole result set, so page 2 starts at 13.
  const firstRank = (page - 1) * PAGE_SIZE + 1 + (lead ? 1 : 0);

  return (
    <div>
      {lead && <Lead story={lead} label={LEAD_LABEL[sort]} />}

      {rest.length > 0 && (
        /* Narrower than the poster above it. Left at full page width the
           thumbnail ended up a third of a screen from its own headline,
           with nothing in between. */
        <div
          className={`max-w-4xl divide-y divide-rule border-t border-rule ${
            lead ? "mt-14" : ""
          }`}
        >
          {rest.map((s, i) => (
            <Row key={s.id} story={s} query={query} rank={firstRank + i} />
          ))}
        </div>
      )}
    </div>
  );
}

/** The top of the ranking, at poster size. */
function Lead({ story, label }: { story: SearchResult; label: string }) {
  const href = `/@${story.handle}/${story.slug}`;

  return (
    <article className="group grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      {story.cover && (
        <Link href={href} className="relative block lg:order-2" tabIndex={-1} aria-hidden>
          {/* The offset colour block from the home page's opener: the same
              printed-poster trick, so the top of a search reads with the
              same weight as the top of the site. */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10 translate-x-3 translate-y-3 rounded-2xl bg-sun sm:translate-x-4 sm:translate-y-4"
          />
          <div className="relative overflow-hidden rounded-2xl border-2 border-foreground/80 bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
            <img
              src={story.cover.url}
              alt=""
              width={story.cover.width}
              height={story.cover.height}
              className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            {story.placeName && (
              <div className="absolute bottom-4 left-4">
                <span className="inline-flex items-center rounded-full bg-background/90 p-1 backdrop-blur-sm">
                  <PlaceMark
                    place={story.placeName}
                    countryCode={story.countryCode}
                    size="sm"
                  />
                </span>
              </div>
            )}
          </div>
        </Link>
      )}

      <div className="lg:order-1">
        {/* Says why this one is big. Without it, a poster at the top of a
            result list looks like an advert for whatever it happens to be. */}
        <p className="mb-5 inline-flex items-center gap-2.5 rounded-full border-2 border-dashed border-accent/60 bg-accent/8 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
          <span aria-hidden className="text-base leading-none">★</span>
          {label}
        </p>

        <Link href={href} className="block">
          <h3 className="font-display text-balance text-4xl font-semibold leading-[1.04] tracking-tight decoration-4 underline-offset-8 group-hover:underline sm:text-5xl">
            {story.title || "Untitled"}
          </h3>
          {/* The matched fragment, at reading size rather than as caption
              text: it is the evidence, and on a search page the evidence is
              worth more room than a generic opening paragraph. */}
          <p className="mt-5 line-clamp-5 border-l-4 border-accent/60 pl-5 text-lg leading-relaxed text-muted">
            {story.snippet ? (
              <Highlighted snippet={story.snippet} />
            ) : (
              excerpt(story.excerpt || story.bodyText, 280)
            )}
          </p>
        </Link>

        {story.tags.length > 0 && (
          <p className="mt-5 flex flex-wrap items-center gap-1.5">
            {story.tags.map((t) => (
              <TagChip key={t.slug} slug={t.slug} label={t.label} size="sm" />
            ))}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
          {!story.cover && story.placeName && (
            <PlaceMark
              place={story.placeName}
              countryCode={story.countryCode}
              size="sm"
            />
          )}
          <Link
            href={`/@${story.handle}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Avatar
              name={story.displayName}
              handle={story.handle}
              avatarKey={story.avatarKey}
              size="sm"
            />
            {story.displayName}
          </Link>
          {story.readingMinutes > 0 && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <span>{story.readingMinutes} min</span>
            </>
          )}
          {/* Only once there is something to report. "0 likes" under every
              story on a new site reads as a verdict. */}
          {story.likeCount > 0 && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <span>
                {story.likeCount} {story.likeCount === 1 ? "like" : "likes"}
              </span>
            </>
          )}
          {story.commentCount > 0 && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <span>
                {story.commentCount}{" "}
                {story.commentCount === 1 ? "comment" : "comments"}
              </span>
            </>
          )}
          {story.publishedAt && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <time dateTime={story.publishedAt.toISOString()}>
                {story.publishedAt.toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** The tail of the ranking: numbered rows, snippet included. */
function Row({
  story,
  rank,
  query,
}: {
  story: SearchResult;
  rank: number;
  query: Query;
}) {
  const href = `/@${story.handle}/${story.slug}`;

  return (
    <article className="group flex items-start gap-5 py-7 sm:gap-7">
      {/* The position, stated. It is the only thing distinguishing one row
          from the next, and a reader who has scrolled past a poster and
          three cards has earned being told where they are. */}
      <span
        aria-hidden
        className="font-display hidden w-10 shrink-0 pt-1 text-right text-lg font-semibold tabular-nums text-faint sm:block"
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        {(story.placeName || story.tags.length > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {story.placeName && (
              <PlaceMark
                place={story.placeName}
                countryCode={story.countryCode}
                size="sm"
                href={storiesHref(query, {
                  country: story.countryCode,
                  city: story.placeName,
                  page: 1,
                })}
              />
            )}
            {story.tags.map((t) => (
              <TagChip key={t.slug} slug={t.slug} label={t.label} size="sm" />
            ))}
          </div>
        )}

        {/* Capped measure: these excerpts set past 110 characters a line on
            a full-width page. */}
        <Link href={href} className="block max-w-[56ch]">
          <h3 className="font-display text-balance text-xl font-semibold leading-snug decoration-2 underline-offset-4 group-hover:underline sm:text-2xl">
            {story.title || "Untitled"}
          </h3>
          <p className="mt-2 line-clamp-2 leading-relaxed text-muted">
            {story.snippet ? (
              <Highlighted snippet={story.snippet} />
            ) : (
              excerpt(story.excerpt || story.bodyText, 180)
            )}
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
          <Link
            href={`/@${story.handle}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Avatar
              name={story.displayName}
              handle={story.handle}
              avatarKey={story.avatarKey}
              size="sm"
            />
            {story.displayName}
          </Link>
          {story.readingMinutes > 0 && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <span>{story.readingMinutes} min</span>
            </>
          )}
          {/* Only once there is something to report. "0 likes" under every
              story on a new site reads as a verdict. */}
          {story.likeCount > 0 && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <span>
                {story.likeCount} {story.likeCount === 1 ? "like" : "likes"}
              </span>
            </>
          )}
          {story.commentCount > 0 && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <span>
                {story.commentCount}{" "}
                {story.commentCount === 1 ? "comment" : "comments"}
              </span>
            </>
          )}
          {story.publishedAt && (
            <>
              <span aria-hidden className="text-faint">·</span>
              <time dateTime={story.publishedAt.toISOString()}>
                {story.publishedAt.toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </>
          )}
        </div>
      </div>

      {story.cover && (
        <Link
          href={href}
          className="shrink-0 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow)]"
          tabIndex={-1}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
          <img
            src={story.cover.url}
            alt=""
            width={story.cover.width}
            height={story.cover.height}
            loading="lazy"
            className="h-24 w-32 object-cover transition-transform duration-500 group-hover:scale-105 sm:h-28 sm:w-44"
          />
        </Link>
      )}
    </article>
  );
}
