import Link from "next/link";
import type { Placement } from "@/lib/collections";

/**
 * "Part three of eleven days down the coast", with the way onwards.
 *
 * The label alone would be decoration. The point of arranging stories in
 * order is that finishing part three should put part four in front of you,
 * so the neighbours are the feature and the title is the context.
 */
export function TripNav({ placements }: { placements: Placement[] }) {
  if (placements.length === 0) return null;

  return (
    <div className="mt-16 space-y-6">
      {placements.map((p) => (
        <nav
          key={`${p.collection.handle}/${p.collection.slug}`}
          aria-label={`Part ${p.position} of ${p.collection.title}`}
          className="rounded-2xl border-2 border-rule bg-surface/60 p-5"
        >
          <p className="text-sm text-muted">
            Part{" "}
            <span className="font-display font-semibold text-foreground">
              {p.position}
            </span>{" "}
            of {p.total} ·{" "}
            <Link
              href={`/@${p.collection.handle}/trips/${p.collection.slug}`}
              className="font-medium text-accent underline underline-offset-4"
            >
              {p.collection.title}
            </Link>
          </p>

          {(p.previous || p.next) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Each side keeps its slot even when empty, so the "next"
                  link does not slide to the left on the first part. */}
              <Step side="previous" link={p.previous} />
              <Step side="next" link={p.next} />
            </div>
          )}
        </nav>
      ))}
    </div>
  );
}

function Step({
  side,
  link,
}: {
  side: "previous" | "next";
  link: { title: string; href: string } | null;
}) {
  if (!link) return <span aria-hidden className="hidden sm:block" />;

  return (
    <Link
      href={link.href}
      className={`group rounded-xl border border-rule px-4 py-3 transition-colors hover:border-accent/50 ${
        side === "next" ? "sm:text-right" : ""
      }`}
    >
      <span className="eyebrow block">
        {side === "previous" ? "← Before this" : "After this →"}
      </span>
      <span className="font-display mt-1 block text-balance font-semibold leading-tight group-hover:underline">
        {link.title}
      </span>
    </Link>
  );
}
