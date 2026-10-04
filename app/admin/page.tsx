import Link from "next/link";
import { notFound } from "next/navigation";
import { getModerator } from "@/lib/session";
import { openReports, recentlyResolved } from "@/lib/reports";
import { REASON_LABEL } from "@/lib/report-rules";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportActions } from "./ReportActions";
import { RestoreButton } from "./RestoreButton";

/**
 * Resolved per viewer, not declared statically.
 *
 * A static `metadata` export is rendered even when the page body calls
 * notFound(), so the tab read "Reports · Wendfolk" over a page that said
 * "No such place" -- which told an ordinary account exactly what it was
 * being kept out of. The 404 now looks like every other 404.
 */
export async function generateMetadata() {
  const viewer = await getModerator();
  if (!viewer) return {};
  return {
    title: "Reports",
    // Never, under any circumstances.
    robots: { index: false, follow: false },
  };
}

/**
 * The moderation queue.
 *
 * 404 rather than 403 for everyone else: the same rule the rest of the
 * site follows, so the existence of an admin area is not something an
 * ordinary account can confirm.
 */
export default async function AdminPage() {
  const viewer = await getModerator();
  if (!viewer) notFound();

  const [queue, recent] = await Promise.all([openReports(), recentlyResolved()]);

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {queue.length === 0
              ? "Nothing waiting."
              : `${queue.length} open · oldest first`}
          </p>
        </div>
        <p className="text-sm text-faint">
          Signed in as {viewer.role}
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="Queue is clear">
            Reports from readers land here. Nothing has been flagged.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-10 divide-y-2 divide-rule">
          {queue.map((r) => (
            <li key={r.id} className="py-7">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                  {REASON_LABEL[r.reason]}
                </span>
                <span className="text-sm text-muted">
                  {r.target?.kind === "story"
                    ? "a story"
                    : r.target?.kind === "collection"
                      ? "a trip"
                      : "a comment"}{" "}
                  · reported by @{r.reporter}
                </span>
                <time
                  dateTime={r.createdAt.toISOString()}
                  className="text-xs text-faint"
                >
                  {r.createdAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>

              {r.detail && (
                <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm italic text-muted">
                  “{r.detail}”
                </p>
              )}

              {/* What was actually said, quoted here so a decision does not
                  need a round trip to the story and back. */}
              <div className="mt-4 max-w-2xl rounded-xl border border-rule bg-surface/60 p-4">
                {r.target === null ? (
                  <p className="text-sm text-faint">
                    Already deleted — nothing left to act on.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-faint">
                      {r.target.authorName} (@{r.target.authorHandle})
                      {r.target.removed && " · already removed"}
                    </p>
                    {r.target.kind !== "comment" ? (
                      <>
                        <p className="font-display mt-1 text-lg font-semibold">
                          {r.target.title}
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted">
                          {r.target.excerpt}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm">
                        {r.target.body}
                      </p>
                    )}
                    <Link
                      href={r.target.href}
                      className="mt-3 inline-block text-xs text-accent underline underline-offset-2"
                    >
                      Open it
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-4">
                <ReportActions
                  reportId={r.id}
                  targetKind={r.target?.kind ?? null}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <section className="mt-16">
          <div className="mb-4 flex items-baseline gap-4">
            <h2 className="eyebrow">Recently closed</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          <ul className="space-y-1.5 text-sm text-muted">
            {recent.map((r) => (
              <li key={r.id}>
                <span
                  className={
                    r.status === "upheld" ? "text-red-600 dark:text-red-400" : ""
                  }
                >
                  {r.status === "upheld" ? "Removed" : "Dismissed"}
                </span>{" "}
                — {REASON_LABEL[r.reason]} on{" "}
                {r.storyId ? "a story" : "a comment"}
                {r.resolvedAt && (
                  <span className="text-faint">
                    {" "}
                    · {r.resolvedAt.toLocaleDateString()}
                  </span>
                )}
                {/* Only for a story that is actually still down -- a
                    dismissed report has nothing to put back. */}
                {r.storyId && r.storyStillRemoved && (
                  <RestoreButton storyId={r.storyId} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
