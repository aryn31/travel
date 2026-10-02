import Link from "next/link";
import { excerpt } from "@/lib/story-doc";
import type { StoryCard } from "@/components/StoryList";
import { Avatar } from "@/components/ui/Avatar";
import { flagFor } from "@/components/ui/PlaceMark";

/**
 * A mosaic of unequal tiles rather than a list of equal rows.
 *
 * Sizes cycle on a fixed six-step pattern keyed to the index, so the layout
 * is deterministic -- the same story always lands in the same shape, and it
 * can be server-rendered without measuring anything.
 *
 * Aspect ratios do the work instead of row spans: a row-span mosaic needs
 * every tile's height to be known up front, and story titles are not a fixed
 * length.
 */
const SHAPES = [
  { span: "lg:col-span-4", ratio: "aspect-[16/10]", size: "lg" },
  { span: "lg:col-span-2", ratio: "aspect-[4/5]", size: "sm" },
  { span: "lg:col-span-3", ratio: "aspect-[3/2]", size: "md" },
  { span: "lg:col-span-3", ratio: "aspect-[3/2]", size: "md" },
  { span: "lg:col-span-2", ratio: "aspect-[4/5]", size: "sm" },
  { span: "lg:col-span-4", ratio: "aspect-[16/10]", size: "lg" },
] as const;

const TITLE_SIZE = {
  lg: "text-2xl sm:text-3xl",
  md: "text-xl sm:text-2xl",
  sm: "text-lg sm:text-xl",
} as const;

export function StoryMosaic({ stories }: { stories: StoryCard[] }) {
  if (stories.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {stories.map((s, i) => {
        const shape = SHAPES[i % SHAPES.length];
        const n = String(i + 1).padStart(2, "0");

        return (
          <article
            key={s.id}
            className={`group relative isolate overflow-hidden rounded-2xl ${shape.span}`}
          >
            <Link href={`/@${s.handle}/${s.slug}`} className="block">
              <div className={`relative ${shape.ratio} w-full bg-surface`}>
                {s.cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
                    <img
                      src={s.cover.url}
                      alt=""
                      width={s.cover.width}
                      height={s.cover.height}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Text sits on the photograph, so the scrim is fixed dark
                        and the type fixed light -- it cannot follow the theme
                        when the thing behind it is a photo. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5"
                    />
                  </>
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-accent/25 via-sun/15 to-sea/25"
                  />
                )}

                {/* Tile index, oversized and half off the corner. */}
                <span
                  aria-hidden
                  className="font-display pointer-events-none absolute -bottom-3 right-3 select-none text-7xl font-semibold leading-none text-white/15"
                >
                  {n}
                </span>

                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6">
                  {s.placeName && (
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
                      <span aria-hidden className="text-sm leading-none">
                        {s.countryCode ? (flagFor(s.countryCode) ?? "📍") : "📍"}
                      </span>
                      {s.placeName}
                    </p>
                  )}

                  <h3
                    className={`font-display text-balance font-semibold leading-tight text-white decoration-2 underline-offset-4 group-hover:underline ${TITLE_SIZE[shape.size]}`}
                  >
                    {s.title || "Untitled"}
                  </h3>

                  {shape.size !== "sm" && (
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/75">
                      {excerpt(s.excerpt || s.bodyText, 130)}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                    <Avatar
                      name={s.displayName}
                      handle={s.handle}
                      avatarKey={s.avatarKey}
                      size="sm"
                    />
                    <span>{s.displayName}</span>
                    {s.readingMinutes > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{s.readingMinutes} min</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
