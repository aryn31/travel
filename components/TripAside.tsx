import Link from "next/link";
import type { Placement } from "@/lib/collections";

/**
 * "You have landed in the middle of something."
 *
 * The block at the foot of the story answers "what next", which is only
 * any use to somebody who has already finished. Most readers arrive at
 * part three from a search or a shared link with no idea the other parts
 * exist -- so the trip has to be visible on arrival, not as a reward.
 *
 * A short table of contents rather than a bare link: seeing that there are
 * two pieces before this one is the thing that makes a reader go back to
 * the beginning.
 */
export function TripAside({ placements }: { placements: Placement[] }) {
  if (placements.length === 0) return null;

  return (
    <div className="mt-6 space-y-5 border-t border-rule pt-5">
      {placements.map((p) => (
        <section key={p.collection.href}>
          <p className="eyebrow">Part of a trip</p>

          <Link
            href={p.collection.href}
            className="font-display mt-1.5 block text-balance text-base font-semibold leading-tight transition-colors hover:text-accent"
          >
            {p.collection.title}
          </Link>

          <p className="mt-1 text-xs text-faint">
            {p.total} parts
            {p.minutes > 0 && ` · ${p.minutes} min in all`}
          </p>

          <ol className="mt-3 space-y-1.5 text-sm">
            {p.parts.map((part, i) => (
              <li key={part.href} className="flex gap-2">
                <span
                  aria-hidden
                  className={`shrink-0 tabular-nums ${
                    part.current ? "text-accent" : "text-faint"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {part.current ? (
                  /* The one you are reading is not a link to itself. */
                  <span
                    aria-current="true"
                    className="line-clamp-2 font-medium text-accent"
                  >
                    {part.title}
                  </span>
                ) : (
                  <Link
                    href={part.href}
                    className="line-clamp-2 text-muted transition-colors hover:text-foreground"
                  >
                    {part.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
