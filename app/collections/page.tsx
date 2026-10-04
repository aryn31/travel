import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, isModerator } from "@/lib/session";
import { listFor } from "@/lib/collections";
import { VISIBILITY_LABEL } from "@/lib/visibility";
import { flagFor } from "@/components/ui/PlaceMark";
import { EmptyState } from "@/components/ui/EmptyState";
import { createCollectionAction } from "./actions";

export const metadata = { title: "Your trips" };

/**
 * The shelf: every collection this person has, in any state.
 *
 * Separate from /drafts rather than a section of it. A draft is a story
 * being written; a collection is a way of arranging stories that are
 * already written, and the two lists answer different questions.
 */
export default async function CollectionsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=%2Fcollections");
  if (!viewer.profile) redirect("/onboarding");
  /* Staff accounts do not write -- see isModerator in lib/session.ts. A
     redirect rather than a 404: the page plainly exists, it is just not
     this account's business, and sending them where they belong is more
     use than pretending otherwise. */
  if (isModerator(viewer)) redirect("/admin");

  const mine = await listFor(viewer.userId, false);

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Your trips
        </h1>
        <p className="mt-2 text-muted">
          A fortnight is five stories, not one. Put them in order and they read
          as the journey they were.
        </p>
      </div>

      <form
        action={createCollectionAction}
        className="mt-8 flex max-w-xl flex-wrap gap-3"
      >
        <label htmlFor="new-trip" className="sr-only">
          Name the trip
        </label>
        <input
          id="new-trip"
          name="title"
          required
          maxLength={120}
          placeholder="Eleven days down the coast…"
          className="min-w-[14rem] flex-1 rounded-full border-2 border-foreground/15 bg-background px-5 py-3 outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          Start one
        </button>
      </form>

      {mine.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="No trips yet">
            Name one above, then add stories you have already written.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((c) => (
            <li key={c.id}>
              <Link
                href={`/collections/${c.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-rule bg-surface transition-colors hover:border-accent/50"
              >
                {c.cover ? (
                  <div className="overflow-hidden bg-rule">
                    {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
                    <img
                      src={c.cover.url}
                      alt=""
                      width={c.cover.width}
                      height={c.cover.height}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className="aspect-[16/10] w-full border-b border-rule bg-background"
                  />
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="eyebrow">
                      {VISIBILITY_LABEL[c.status]}
                    </span>
                    {c.countries.map((code) => (
                      <span key={code} aria-hidden className="text-sm leading-none">
                        {flagFor(code)}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-display text-xl font-semibold leading-tight group-hover:underline">
                    {c.title || "Untitled trip"}
                  </h2>
                  <p className="mt-auto pt-4 text-sm text-muted">
                    {c.storyCount} {c.storyCount === 1 ? "story" : "stories"}
                    {c.minutes > 0 && ` · ${c.minutes} min`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
