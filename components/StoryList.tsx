import Link from "next/link";
import { excerpt } from "@/lib/story-doc";

export type StoryCard = {
  id: string;
  slug: string;
  title: string;
  bodyText: string;
  readingMinutes: number;
  publishedAt: Date | null;
  handle: string;
  displayName: string;
};

export function StoryList({
  stories,
  showAuthor = true,
}: {
  stories: StoryCard[];
  showAuthor?: boolean;
}) {
  return (
    <ul className="divide-y divide-black/10 dark:divide-white/15">
      {stories.map((s) => (
        <li key={s.id} className="py-6">
          <Link href={`/@${s.handle}/${s.slug}`} className="group block">
            <h3 className="text-xl font-medium tracking-tight group-hover:underline">
              {s.title || "Untitled"}
            </h3>
            <p className="mt-1.5 line-clamp-2 leading-relaxed opacity-60">
              {excerpt(s.bodyText, 180)}
            </p>
          </Link>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm opacity-40">
            {showAuthor && (
              <>
                <Link href={`/@${s.handle}`} className="hover:underline">
                  {s.displayName}
                </Link>
                <span aria-hidden>·</span>
              </>
            )}
            {s.publishedAt && (
              <time dateTime={s.publishedAt.toISOString()}>
                {s.publishedAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            )}
            {s.readingMinutes > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{s.readingMinutes} min</span>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
