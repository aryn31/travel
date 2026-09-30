import Link from "next/link";
import { excerpt } from "@/lib/story-doc";
import type { SearchResult, Snippet } from "@/lib/search";
import { CARD_HUES } from "@/components/home/StoryGrid";
import { Avatar } from "@/components/ui/Avatar";
import { PlaceMark } from "@/components/ui/PlaceMark";

/**
 * The matched words, as Postgres found them. ts_headline already picked the
 * fragment; this only turns its markers into elements, which is why the
 * highlight is trustworthy -- it is the same match that ranked the result.
 */
function Highlighted({ snippet }: { snippet: Snippet }) {
  return (
    <>
      {snippet.map((run, i) =>
        run.hit ? (
          <mark
            key={i}
            className="rounded bg-sun/30 px-0.5 text-foreground dark:bg-sun/25"
          >
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}

export function ResultGrid({ results }: { results: SearchResult[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((s, i) => {
        const hue = CARD_HUES[i % CARD_HUES.length];
        const href = `/@${s.handle}/${s.slug}`;

        return (
          <li key={s.id} className="flex">
            <article
              className={`group flex w-full flex-col overflow-hidden rounded-2xl border-2 bg-surface transition-all duration-300 hover:-translate-y-1.5 ${hue.border} ${hue.glow}`}
            >
              <span aria-hidden className={`block h-1.5 w-full ${hue.bar}`} />

              <Link href={href} className="block" tabIndex={-1} aria-hidden>
                {s.cover ? (
                  <div className="overflow-hidden bg-rule">
                    {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
                    <img
                      src={s.cover.url}
                      alt=""
                      width={s.cover.width}
                      height={s.cover.height}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className="flex aspect-[16/10] w-full items-center justify-center border-b border-rule bg-background"
                  >
                    <span className="font-display text-5xl text-faint">
                      {(s.title || "?").trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>

              <div className="flex flex-1 flex-col p-5">
                {s.placeName && (
                  <div className="mb-3">
                    <PlaceMark
                      place={s.placeName}
                      countryCode={s.countryCode}
                      size="sm"
                    />
                  </div>
                )}

                <Link href={href} className="block">
                  <h3 className="font-display text-balance text-xl font-semibold leading-tight decoration-2 underline-offset-4 group-hover:underline">
                    {s.title || "Untitled"}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                    {s.snippet ? (
                      <Highlighted snippet={s.snippet} />
                    ) : (
                      excerpt(s.excerpt || s.bodyText, 150)
                    )}
                  </p>
                </Link>

                <div
                  className={`mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t-2 pt-4 text-sm text-muted ${hue.border}`}
                >
                  <Link
                    href={`/@${s.handle}`}
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <Avatar name={s.displayName} handle={s.handle} size="sm" />
                    {s.displayName}
                  </Link>
                  {s.readingMinutes > 0 && (
                    <>
                      <span aria-hidden className="text-faint">·</span>
                      <span>{s.readingMinutes} min</span>
                    </>
                  )}
                  {s.publishedAt && (
                    <>
                      <span aria-hidden className="text-faint">·</span>
                      <time dateTime={s.publishedAt.toISOString()}>
                        {s.publishedAt.toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </>
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
