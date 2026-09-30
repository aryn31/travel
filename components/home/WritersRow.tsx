import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { flagFor } from "@/components/ui/PlaceMark";

export type WriterCard = {
  handle: string;
  displayName: string;
  bio: string | null;
  homeCountry: string | null;
  stories: number;
  countries: string[];
};

/**
 * People, not posts. A reader who follows a writer comes back; a reader who
 * finishes one article does not. This is also the clearest signal on the
 * page that real people are behind the stories.
 */
export function WritersRow({ writers }: { writers: WriterCard[] }) {
  if (writers.length === 0) return null;

  return (
    <div>
      <div className="mb-7 flex items-baseline gap-4">
        <h2 className="eyebrow">The people writing</h2>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {writers.map((w) => (
          <li key={w.handle}>
            <Link
              href={`/@${w.handle}`}
              className="group flex h-full gap-4 rounded-2xl border border-rule bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow)] lg:flex-col lg:gap-3"
            >
              <Avatar name={w.displayName} handle={w.handle} size="md" />
              <div className="min-w-0">
                <p className="font-display font-semibold leading-tight group-hover:text-accent">
                  {w.displayName}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
                  {w.bio?.trim() ||
                    (w.homeCountry
                      ? `Writing from ${w.homeCountry}.`
                      : "Writing here.")}
                </p>
                <p className="mt-2.5 flex items-center gap-2 text-xs text-faint">
                  <span>
                    {w.stories} {w.stories === 1 ? "story" : "stories"}
                  </span>
                  {w.countries.length > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span aria-label="Countries written about">
                        {w.countries.map((c) => flagFor(c) ?? "").join(" ")}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
