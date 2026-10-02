import Link from "next/link";
import { excerpt } from "@/lib/story-doc";
import { Avatar } from "./ui/Avatar";
import { PlaceMark } from "./ui/PlaceMark";

export type StoryCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyText: string;
  readingMinutes: number;
  publishedAt: Date | null;
  handle: string;
  displayName: string;
  avatarKey: string | null;
  placeName: string | null;
  countryCode: string | null;
  cover: { url: string; width: number; height: number } | null;
};

function Byline({ story, showAuthor }: { story: StoryCard; showAuthor: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
      {showAuthor && (
        <>
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
          <span aria-hidden className="text-faint">·</span>
        </>
      )}
      {story.publishedAt && (
        <time dateTime={story.publishedAt.toISOString()}>
          {story.publishedAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      )}
      {story.readingMinutes > 0 && (
        <>
          <span aria-hidden className="text-faint">·</span>
          <span>{story.readingMinutes} min</span>
        </>
      )}
    </div>
  );
}

/** The newest story, given the space of a magazine opener. */
function Featured({ story, showAuthor }: { story: StoryCard; showAuthor: boolean }) {
  return (
    // Stacked on narrow screens, side by side once there is room -- a single
    // column lead on a 1300px page is mostly empty margin.
    <article className="group grid items-center gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
      {story.cover && (
        <Link
          href={`/@${story.handle}/${story.slug}`}
          className="relative block lg:order-2"
          tabIndex={-1}
          aria-hidden
        >
          {/* Solid colour block sitting behind and offset from the photo --
              the printed-poster trick. Purely decorative. */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10 translate-x-3 translate-y-3 rounded-2xl bg-sea sm:translate-x-4 sm:translate-y-4"
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
                <span className="inline-flex items-center rounded-full bg-background/90 px-1 py-1 backdrop-blur-sm">
                  <PlaceMark
                    place={story.placeName}
                    countryCode={story.countryCode}
                    size="sm"
                  />
                </span>
              </div>
            )}

            {/* Passport-stamp badge: tilted, ruled, deliberately rough. */}
            <span
              aria-hidden
              className="absolute right-4 top-4 -rotate-12 rounded-lg border-2 border-dashed border-accent bg-background/85 px-3 py-1.5 text-center shadow-[var(--shadow)] backdrop-blur-sm"
            >
              <span className="block text-[0.6rem] font-bold uppercase tracking-[0.18em] text-accent">
                Latest
              </span>
              {story.publishedAt && (
                <span className="block text-[0.6rem] font-medium uppercase tracking-wider text-accent/80">
                  {story.publishedAt.toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              )}
            </span>
          </div>
        </Link>
      )}

      <div className="lg:order-1">
        <span
          aria-hidden
          className="mb-5 block h-2 w-24 rounded-full bg-gradient-to-r from-accent via-sun to-sea"
        />
        <Link href={`/@${story.handle}/${story.slug}`} className="block">
          <h3 className="font-display text-balance text-4xl font-semibold leading-[1.02] tracking-tight decoration-4 underline-offset-8 group-hover:underline sm:text-5xl lg:text-6xl">
            {story.title || "Untitled"}
          </h3>
          <p className="mt-5 line-clamp-4 border-l-4 border-accent/60 pl-5 text-lg leading-relaxed text-muted">
            {excerpt(story.excerpt || story.bodyText, 280)}
          </p>
        </Link>
        <div className="mt-6">
          <Byline story={story} showAuthor={showAuthor} />
        </div>
      </div>
    </article>
  );
}

function Row({ story, showAuthor }: { story: StoryCard; showAuthor: boolean }) {
  return (
    <article className="group py-7">
      <div className="flex items-start gap-5 sm:gap-7">
        <div className="min-w-0 flex-1">
          {story.placeName && (
            <div className="mb-2">
              <PlaceMark
                place={story.placeName}
                countryCode={story.countryCode}
                size="sm"
              />
            </div>
          )}
          {/* Capped measure: on a full-width page these excerpts were
              setting past 110 characters a line. */}
          <Link href={`/@${story.handle}/${story.slug}`} className="block max-w-[52ch]">
            <h3 className="font-display text-balance text-xl font-semibold leading-snug decoration-2 underline-offset-4 group-hover:underline sm:text-2xl">
              {story.title || "Untitled"}
            </h3>
            <p className="mt-2 line-clamp-2 leading-relaxed text-muted">
              {excerpt(story.excerpt || story.bodyText, 180)}
            </p>
          </Link>
          <div className="mt-3">
            <Byline story={story} showAuthor={showAuthor} />
          </div>
        </div>

        {story.cover && (
          <Link
            href={`/@${story.handle}/${story.slug}`}
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
              className="h-24 w-32 object-cover transition-transform duration-500 group-hover:scale-105 sm:h-32 sm:w-52"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

export function StoryList({
  stories,
  showAuthor = true,
  featured = false,
}: {
  stories: StoryCard[];
  showAuthor?: boolean;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <>
        {stories.map((s) => (
          <Featured key={s.id} story={s} showAuthor={showAuthor} />
        ))}
      </>
    );
  }

  return (
    <div className="divide-y divide-rule">
      {stories.map((s) => (
        <Row key={s.id} story={s} showAuthor={showAuthor} />
      ))}
    </div>
  );
}
