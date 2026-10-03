import { storiesHref, type Query } from "@/lib/search";
import type { TagFacet } from "@/lib/tags";

/**
 * The third filter row: what a story is about.
 *
 * Styled as tags rather than as another pill row -- the country and city
 * chips are both places, and a reader should be able to see at a glance
 * that this row answers a different question.
 */
export function TagFilter({
  facets,
  query,
}: {
  facets: TagFacet[];
  query: Query;
}) {
  if (facets.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1">About</span>
      {facets.map((t) => {
        const active = query.tag === t.slug;
        return (
          <a
            key={t.slug}
            // Clicking the tag you are already in takes it off again.
            href={storiesHref(query, { tag: active ? null : t.slug, page: 1 })}
            aria-current={active ? "true" : undefined}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-medium transition-colors ${
              active
                ? "border-plum bg-plum text-background"
                : "border-plum/30 bg-plum/8 text-plum hover:border-plum/60 hover:bg-plum/15"
            }`}
          >
            <span aria-hidden className="opacity-60">#</span>
            {t.label}
            <span className={active ? "ml-1 opacity-70" : "ml-1 text-plum/50"}>
              {t.count}
            </span>
          </a>
        );
      })}
    </div>
  );
}
