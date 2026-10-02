import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type WriterHit = {
  handle: string;
  displayName: string;
  avatarKey: string | null;
  bio: string | null;
  stories: number;
};

/**
 * Shown above the results when the search terms matched a person. Typing a
 * name is usually a search for the writer, not for one story they wrote, so
 * the profile is offered directly instead of being buried in a byline.
 */
export function WriterHits({ writers }: { writers: WriterHit[] }) {
  if (writers.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-baseline gap-4">
        <h2 className="eyebrow">
          {writers.length === 1 ? "A writer" : "Writers"} by that name
        </h2>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {writers.map((w) => (
          <li key={w.handle}>
            <Link
              href={`/@${w.handle}`}
              className="group flex h-full items-center gap-3 rounded-2xl border-2 border-rule bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50"
            >
              <Avatar
                name={w.displayName}
                handle={w.handle}
                avatarKey={w.avatarKey}
                size="md"
              />
              <div className="min-w-0">
                <p className="font-display truncate font-semibold leading-tight group-hover:text-accent">
                  {w.displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  @{w.handle} · {w.stories}{" "}
                  {w.stories === 1 ? "story" : "stories"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
