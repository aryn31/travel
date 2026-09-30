import Link from "next/link";
import { excerpt } from "@/lib/story-doc";
import type { StoryCard } from "@/components/StoryList";
import { Avatar } from "@/components/ui/Avatar";
import { PlaceMark } from "@/components/ui/PlaceMark";

function Meta({ story }: { story: StoryCard }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
      <Link
        href={`/@${story.handle}`}
        className="inline-flex items-center gap-2 hover:text-foreground"
      >
        <Avatar name={story.displayName} handle={story.handle} size="sm" />
        {story.displayName}
      </Link>
      {story.readingMinutes > 0 && (
        <>
          <span aria-hidden className="text-faint">·</span>
          <span>{story.readingMinutes} min</span>
        </>
      )}
    </p>
  );
}

/**
 * Three real cards. The lead above and the rows below stay borderless -- if
 * every module were a card the page would go back to being one shape
 * repeated, which is the thing the rhythm was introduced to fix.
 */
/* One hue per card, by position, so the row reads as a set rather than three
   copies. Border, rule and number all take the same colour. */
export const CARD_HUES = [
  { border: "border-accent/45", bar: "bg-accent", text: "text-accent", glow: "hover:shadow-[0_18px_40px_-20px_var(--accent)]" },
  { border: "border-sea/45", bar: "bg-sea", text: "text-sea", glow: "hover:shadow-[0_18px_40px_-20px_var(--sea)]" },
  { border: "border-indigo/45", bar: "bg-indigo", text: "text-indigo", glow: "hover:shadow-[0_18px_40px_-20px_var(--indigo)]" },
  { border: "border-moss/45", bar: "bg-moss", text: "text-moss", glow: "hover:shadow-[0_18px_40px_-20px_var(--moss)]" },
  { border: "border-plum/45", bar: "bg-plum", text: "text-plum", glow: "hover:shadow-[0_18px_40px_-20px_var(--plum)]" },
  { border: "border-sun/45", bar: "bg-sun", text: "text-sun", glow: "hover:shadow-[0_18px_40px_-20px_var(--sun)]" },
];

export function StoryPair({ stories }: { stories: StoryCard[] }) {
  if (stories.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((s, i) => {
        const hue = CARD_HUES[i % CARD_HUES.length];
        return (
        <article
          key={s.id}
          className={`group flex flex-col overflow-hidden rounded-2xl border-2 bg-surface transition-all duration-300 hover:-translate-y-1.5 ${hue.border} ${hue.glow}`}
        >
          <span aria-hidden className={`block h-1.5 w-full ${hue.bar}`} />
          <Link href={`/@${s.handle}/${s.slug}`} className="block">
            {s.cover ? (
              <div className="overflow-hidden bg-rule">
                {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
                <img
                  src={s.cover.url}
                  alt=""
                  width={s.cover.width}
                  height={s.cover.height}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
              </div>
            ) : (
              <div
                aria-hidden
                className="flex aspect-[4/3] w-full items-center justify-center border-b border-rule bg-background"
              >
                <span className="font-display text-5xl text-faint">
                  {(s.title || "?").trim().charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </Link>

          {/* flex-1 so the byline sits on the baseline of every card in the
              row, however long the titles run. */}
          <div className="relative flex flex-1 flex-col p-5">
            <span
              aria-hidden
              className={`font-display pointer-events-none absolute -top-2 right-4 select-none text-6xl font-semibold leading-none opacity-25 ${hue.text}`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {s.placeName && (
              <div className="mb-3">
                <PlaceMark
                  place={s.placeName}
                  countryCode={s.countryCode}
                  size="sm"
                />
              </div>
            )}
            <Link href={`/@${s.handle}/${s.slug}`} className="block">
              <h3 className="font-display text-balance text-xl font-semibold leading-tight decoration-2 underline-offset-4 group-hover:underline">
                {s.title || "Untitled"}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                {excerpt(s.excerpt || s.bodyText, 140)}
              </p>
            </Link>
            <div className={`mt-auto border-t-2 pt-4 ${hue.border}`}>
              <Meta story={s} />
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}
