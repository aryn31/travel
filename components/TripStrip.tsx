import Link from "next/link";
import { flagFor } from "@/components/ui/PlaceMark";
import type { CollectionCard } from "@/lib/collections";

/**
 * Someone's trips, on their profile.
 *
 * Wide and short rather than another grid of story cards: a trip is a way
 * into several stories, not a competitor to them, and a profile that leads
 * with six more cards buries the writing it is supposed to introduce.
 */
export function TripStrip({ trips }: { trips: CollectionCard[] }) {
  if (trips.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-baseline gap-4">
        <h2 className="eyebrow">Trips</h2>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              className="group flex h-full gap-4 rounded-2xl border-2 border-rule p-4 transition-colors hover:border-accent/50"
            >
              {t.cover && (
                <span className="shrink-0 overflow-hidden rounded-xl bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
                  <img
                    src={t.cover.url}
                    alt=""
                    width={t.cover.width}
                    height={t.cover.height}
                    loading="lazy"
                    className="h-20 w-20 object-cover"
                  />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="font-display block text-balance font-semibold leading-tight group-hover:underline">
                  {t.title || "Untitled trip"}
                </span>
                <span className="mt-1.5 block text-sm text-muted">
                  {t.storyCount} {t.storyCount === 1 ? "part" : "parts"}
                  {t.minutes > 0 && ` · ${t.minutes} min`}
                </span>
                {t.countries.length > 0 && (
                  <span aria-hidden className="mt-1.5 flex gap-1 text-sm">
                    {t.countries.map((code) => (
                      <span key={code}>{flagFor(code)}</span>
                    ))}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
