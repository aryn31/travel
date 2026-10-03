import Link from "next/link";
import type { Query } from "@/lib/search";

/**
 * A plain GET form. No client component and no debounced fetch: the results
 * are server-rendered, every search is a real URL that can be shared or
 * bookmarked, and the whole thing works before any JavaScript arrives.
 *
 * The other filters ride along as hidden fields so submitting the box keeps
 * the country you were looking at -- except the page number, which has to
 * reset or a new search lands on page 4 of 1.
 */
export function SearchForm({ query }: { query: Query }) {
  return (
    <form action="/stories" method="get" role="search">
      {query.country && (
        <input type="hidden" name="country" value={query.country} />
      )}
      {query.city && <input type="hidden" name="city" value={query.city} />}
      {query.tag && <input type="hidden" name="tag" value={query.tag} />}
      {query.sort !== "relevant" && (
        <input type="hidden" name="sort" value={query.sort} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-faint"
          >
            ⌕
          </span>
          <label htmlFor="q" className="sr-only">
            Search stories
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="A place, a person, a word you remember…"
            autoComplete="off"
            className="font-display w-full rounded-full border-2 border-foreground/15 bg-background py-4 pl-12 pr-5 text-lg outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </div>

        <button
          type="submit"
          className="shrink-0 rounded-full bg-foreground px-8 py-4 font-medium text-background transition-opacity hover:opacity-90"
        >
          Search
        </button>

        {(query.q || query.country || query.city || query.tag) && (
          <Link
            href="/stories"
            className="flex shrink-0 items-center justify-center rounded-full px-5 py-4 text-sm text-muted transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
