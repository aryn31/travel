import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { countryName } from "@/lib/countries";
import {
  cityFacets,
  countryFacets,
  matchingWriters,
  parseQuery,
  searchStories,
  storiesHref,
  tagFacetsFor,
  SORTS,
  type Query,
  type Sort,
} from "@/lib/search";
import { SearchForm } from "@/components/stories/SearchForm";
import { CountryFilter } from "@/components/stories/CountryFilter";
import { CityFilter } from "@/components/stories/CityFilter";
import { TagFilter } from "@/components/stories/TagFilter";
import { EditorialResults } from "@/components/stories/EditorialResults";
import { WriterHits } from "@/components/stories/WriterHits";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/Reveal";

const SORT_LABELS: Record<Sort, string> = {
  relevant: "Best match",
  recent: "Newest",
  liked: "Most liked",
  longest: "Longest read",
};

export async function generateMetadata({
  searchParams,
}: PageProps<"/stories">) {
  const query = parseQuery(await searchParams);

  /* The city is the most specific thing the URL says, so it wins the tab
     title; a search for a word beats a country but not a named place. */
  const title = query.city
    ? query.country
      ? `${query.city}, ${countryName(query.country)}`
      : query.city
    : query.q
      ? `“${query.q}”`
      : query.country
        ? countryName(query.country)
        : "All stories";

  return {
    title,
    description: "Every story published here, searchable by place or word.",
    // A search result page is not something to index; the stories are.
    robots:
      query.q || query.country || query.city || query.tag
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function StoriesPage({
  searchParams,
}: PageProps<"/stories">) {
  const raw = await searchParams;

  /*
   * The archive is for members. A signed-out reader can still find any one
   * story -- the home page lists them, and the free-read meter lets them
   * finish one -- but browsing and searching everything is what an account
   * buys.
   *
   * The whole query travels in `next`, so signing in returns them to the
   * search they were trying to run rather than to an empty archive.
   */
  if (!(await getViewer())) {
    const qs = new URLSearchParams(
      Object.entries(raw).flatMap(([k, v]) =>
        typeof v === "string" ? [[k, v] as [string, string]] : [],
      ),
    ).toString();
    redirect(`/signin?next=${encodeURIComponent(qs ? `/stories?${qs}` : "/stories")}`);
  }

  const query = parseQuery(raw);

  /* Only changes the wording of the empty state and the headings -- one
     layout now serves both browsing and searching. */
  const searching = Boolean(
    query.q || query.country || query.city || query.tag,
  );

  /*
   * One list, in rank order, whatever brought you here. Size follows
   * position: poster, cards, numbered rows. With a query that ranking is
   * relevance; without one it is the chosen sort, and the lead says which
   * ("Best match" / "Newest" / "Longest read") rather than implying an
   * answer to a question nobody asked.
   *
   * Place is navigated by the chip rows above, not by the shape of the
   * list.
   */
  const [found, facets, cities, topics, writers] = await Promise.all([
    searchStories(query),
    countryFacets(query),
    cityFacets(query),
    tagFacetsFor(query),
    matchingWriters(query),
  ]);

  const { total, pages } = found;

  /* A page number past the end: the pager and the heading both follow the
     real page count rather than echoing ?page=99. */
  const page = Math.min(query.page, pages);
  const shown = { ...query, page };

  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------ *
       * Masthead and controls -- sand
       * ------------------------------------------------------------ */}
      <section className="band topo bg-tint-sand">
        <div className="page py-14">
          {/* No numeral here: the home page's 01/02/03 are a sequence
              through one page, and borrowing the style would imply this is
              the fourth part of it. */}
          <div className="flex items-baseline gap-4">
            <h2 className="eyebrow">The whole archive</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>

          <h1 className="font-display mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
            Every story,
            <span className="text-accent"> everywhere.</span>
          </h1>

          <div className="mt-9 max-w-3xl">
            <SearchForm query={query} />
          </div>

          <div className="mt-7 space-y-3">
            <CountryFilter facets={facets} query={query} />
            <CityFilter cities={cities} query={query} />
            <TagFilter facets={topics} query={query} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ *
       * Results
       * ------------------------------------------------------------ */}
      <section className="page py-12 pb-24">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-5">
          <p className="text-sm text-muted">
            <span className="font-display text-lg font-semibold text-foreground">
              {total}
            </span>{" "}
            {total === 1 ? "story" : "stories"}
            {query.q && (
              <>
                {" "}
                matching{" "}
                <span className="font-medium text-foreground">
                  “{query.q}”
                </span>
              </>
            )}
            {/* Where, stated once in prose. The chips above say what is
                selected by looking selected; this says it in words, which
                is what gets read first. */}
            {query.tag && (
              <>
                {" "}
                about{" "}
                <span className="font-medium text-foreground">
                  {topics.find((t) => t.slug === query.tag)?.label ?? query.tag}
                </span>
              </>
            )}
            {(query.city || query.country) && (
              <>
                {" "}
                in{" "}
                <span className="font-medium text-foreground">
                  {query.city && query.country
                    ? `${query.city}, ${countryName(query.country)}`
                    : (query.city ?? countryName(query.country!))}
                </span>
              </>
            )}
            {/* Countries reachable from here, counted off the facet row
                rather than queried again. */}
            {!query.country && facets.length > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-display text-lg font-semibold text-foreground">
                  {facets.length}
                </span>{" "}
                {facets.length === 1 ? "country" : "countries"}
              </>
            )}
            {pages > 1 && (
              <>
                {" "}
                · page {page} of {pages}
              </>
            )}
          </p>

          <div className="flex items-center gap-1">
            <span className="eyebrow mr-2">Sort</span>
            {SORTS.filter((s) => s !== "relevant" || query.q).map((s) => (
              <Link
                key={s}
                href={storiesHref(query, { sort: s, page: 1 })}
                aria-current={query.sort === s ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  query.sort === s
                    ? "bg-foreground font-medium text-background"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {SORT_LABELS[s]}
              </Link>
            ))}
          </div>
        </div>

        {/* Only on the first page -- it is a header for the search, not a
            row that should repeat down every page of results. */}
        {query.page === 1 && <WriterHits writers={writers} />}

        {found.results.length === 0 ? (
          <EmptyState title={searching ? "Nothing matched" : "Nothing published yet"}>
            {searching ? (
              <>
                Try a place, a country, a writer, or a single word.{" "}
                <Link
                  href="/stories"
                  className="text-accent underline underline-offset-2"
                >
                  Show everything
                </Link>
                .
              </>
            ) : (
              "The first story could be yours."
            )}
          </EmptyState>
        ) : (
          <Reveal>
            <EditorialResults
              results={found.results}
              page={query.page}
              sort={query.sort}
              query={query}
            />
          </Reveal>
        )}

        {pages > 1 && <Pager query={shown} pages={pages} />}
      </section>
    </main>
  );
}

function Pager({ query, pages }: { query: Query; pages: number }) {
  // Windowed around the current page: 40 numbered links is not navigation.
  const from = Math.max(1, Math.min(query.page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const window: number[] = [];
  for (let n = from; n <= to; n++) window.push(n);

  return (
    <nav
      aria-label="Pagination"
      className="mt-14 flex items-center justify-center gap-2"
    >
      <Step
        href={storiesHref(query, { page: query.page - 1 })}
        disabled={query.page <= 1}
      >
        ← Previous
      </Step>

      <div className="hidden items-center gap-1 sm:flex">
        {window.map((n) => (
          <Link
            key={n}
            href={storiesHref(query, { page: n })}
            aria-current={n === query.page ? "page" : undefined}
            className={`font-display inline-flex size-10 items-center justify-center rounded-full text-sm transition-colors ${
              n === query.page
                ? "bg-foreground font-semibold text-background"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {n}
          </Link>
        ))}
      </div>

      <Step
        href={storiesHref(query, { page: query.page + 1 })}
        disabled={query.page >= pages}
      >
        Next →
      </Step>
    </nav>
  );
}

function Step({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const shape =
    "rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors";

  if (disabled) {
    return (
      <span aria-disabled className={`${shape} border-rule text-faint`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${shape} border-foreground/20 hover:border-accent hover:text-accent`}
    >
      {children}
    </Link>
  );
}
