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
            <Avatar name={story.displayName} handle={story.handle} size="sm" />
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
    <article className="group">
      <Link href={`/@${story.handle}/${story.slug}`} className="block">
        {story.cover && (
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow)]">
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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                  <PlaceMark
                    place={story.placeName}
                    countryCode={story.countryCode}
                    size="sm"
                  />
                </span>
              </div>
            )}
          </div>
        )}
        <h3 className="font-display text-balance text-3xl font-semibold leading-[1.15] tracking-tight decoration-2 underline-offset-4 group-hover:underline sm:text-4xl">
          {story.title || "Untitled"}
        </h3>
        <p className="mt-3 line-clamp-3 text-lg leading-relaxed text-muted">
          {excerpt(story.excerpt || story.bodyText, 240)}
        </p>
      </Link>
      <div className="mt-4">
        <Byline story={story} showAuthor={showAuthor} />
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
          <Link href={`/@${story.handle}/${story.slug}`} className="block">
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
              className="h-24 w-32 object-cover transition-transform duration-500 group-hover:scale-105 sm:h-28 sm:w-44"
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
