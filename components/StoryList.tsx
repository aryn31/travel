import Link from "next/link";
import { excerpt } from "@/lib/story-doc";

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
  cover: { url: string; width: number; height: number } | null;
};

function Meta({
  story,
  showAuthor,
}: {
  story: StoryCard;
  showAuthor: boolean;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      {showAuthor && (
        <>
          <Link href={`/@${story.handle}`} className="hover:text-foreground">
            {story.displayName}
          </Link>
          <span aria-hidden>·</span>
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
          <span aria-hidden>·</span>
          <span>{story.readingMinutes} min</span>
        </>
      )}
    </p>
  );
}

/** The most recent story, given room to breathe. */
function Featured({ story, showAuthor }: { story: StoryCard; showAuthor: boolean }) {
  return (
    <article className="pb-10">
      <Link href={`/@${story.handle}/${story.slug}`} className="group block">
        {story.cover && (
          <div className="mb-6 overflow-hidden rounded-xl bg-rule">
            {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
            <img
              src={story.cover.url}
              alt=""
              width={story.cover.width}
              height={story.cover.height}
              className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <h3 className="text-balance text-3xl font-semibold leading-tight tracking-tight group-hover:underline">
          {story.title || "Untitled"}
        </h3>
        <p className="mt-3 line-clamp-3 text-lg leading-relaxed text-muted">
          {excerpt(story.excerpt || story.bodyText, 240)}
        </p>
      </Link>
      <div className="mt-4">
        <Meta story={story} showAuthor={showAuthor} />
      </div>
    </article>
  );
}

function Row({ story, showAuthor }: { story: StoryCard; showAuthor: boolean }) {
  return (
    <article className="py-7">
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <Link href={`/@${story.handle}/${story.slug}`} className="group block">
            <h3 className="text-balance text-xl font-medium leading-snug tracking-tight group-hover:underline">
              {story.title || "Untitled"}
            </h3>
            <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted">
              {excerpt(story.excerpt || story.bodyText, 180)}
            </p>
          </Link>
          <div className="mt-3">
            <Meta story={story} showAuthor={showAuthor} />
          </div>
        </div>

        {story.cover && (
          <Link
            href={`/@${story.handle}/${story.slug}`}
            className="shrink-0"
            tabIndex={-1}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
            <img
              src={story.cover.url}
              alt=""
              width={story.cover.width}
              height={story.cover.height}
              className="h-20 w-28 rounded-lg bg-rule object-cover sm:h-24 sm:w-36"
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
