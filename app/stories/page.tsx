import Link from "next/link";
import {
  countryFacets,
  matchingWriters,
  parseQuery,
  searchStories,
  storiesHref,
  SORTS,
  type Query,
  type Sort,
} from "@/lib/search";
import { SearchForm } from "@/components/stories/SearchForm";
import { CountryFilter } from "@/components/stories/CountryFilter";
import { ResultGrid } from "@/components/stories/ResultGrid";
import { WriterHits } from "@/components/stories/WriterHits";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/Reveal";

const SORT_LABELS: Record<Sort, string> = {
  relevant: "Best match",
  recent: "Newest",
  longest: "Longest read",
};

export async function generateMetadata({
  searchParams,
}: PageProps<"/stories">) {
  const query = parseQuery(await searchParams);
  return {
    title: query.q ? `“${query.q}”` : "All stories",
    description: "Every story published here, searchable by place or word.",
    // A search result page is not something to index; the stories are.
    robots: query.q || query.country ? { index: false, follow: true } : undefined,
  };
}

export default async function StoriesPage({
  searchParams,
}: PageProps<"/stories">) {
  const query = parseQuery(await searchParams);

  const [{ results, total, pages }, facets, writers] = await Promise.all([
    searchStories(query),
    countryFacets(query),
    matchingWriters(query),
  ]);

  const searching = Boolean(query.q || query.country);

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

          <div className="mt-7">
            <CountryFilter facets={facets} query={query} />
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
            {pages > 1 && (
              <>
                {" "}
                · page {query.page} of {pages}
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

        {results.length === 0 ? (
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
            <ResultGrid results={results} />
          </Reveal>
        )}

        {pages > 1 && <Pager query={query} pages={pages} />}
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
