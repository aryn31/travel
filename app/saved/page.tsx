import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, isModerator } from "@/lib/session";
import { savedShelf } from "@/lib/saves";
import { StoryList } from "@/components/StoryList";
import { TripStrip } from "@/components/TripStrip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Saved",
  // A reading list is nobody else's business, search engines included.
  robots: { index: false, follow: false },
};

/**
 * The reading list.
 *
 * Private by construction -- there is no public version of this page and
 * no count anywhere else on the site. What someone means to read is not a
 * signal they have chosen to send.
 */
export default async function SavedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=%2Fsaved");
  if (!viewer.profile) redirect("/onboarding");
  /* Staff accounts do not write -- see isModerator in lib/session.ts. A
     redirect rather than a 404: the page plainly exists, it is just not
     this account's business, and sending them where they belong is more
     use than pretending otherwise. */
  if (isModerator(viewer)) redirect("/admin");

  const shelf = await savedShelf(viewer.userId);
  const total = shelf.stories.length + shelf.trips.length;

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Saved
        </h1>
        <p className="mt-2 text-muted">
          {total === 0
            ? "Nothing yet. The bookmark on any story or trip puts it here."
            : `${total} to come back to. Only you can see this.`}
        </p>
      </div>

      {total === 0 ? (
        <div className="mt-12">
          <EmptyState title="Nothing saved">
            Found something worth finishing later?{" "}
            <Link
              href="/stories"
              className="text-accent underline underline-offset-2"
            >
              Go and find one
            </Link>
            .
          </EmptyState>
        </div>
      ) : (
        <div className="mt-12">
          {shelf.trips.length > 0 && <TripStrip trips={shelf.trips} />}

          {shelf.stories.length > 0 && (
            <section className={shelf.trips.length > 0 ? "mt-16" : ""}>
              <div className="mb-6 flex items-baseline gap-4">
                <h2 className="eyebrow">Stories</h2>
                <span aria-hidden className="h-px flex-1 bg-rule" />
              </div>
              <div className="max-w-4xl">
                <StoryList stories={shelf.stories} />
              </div>
            </section>
          )}
        </div>
      )}

      {/* Said plainly rather than silently dropped: something you saved is
          gone, and noticing it yourself later is worse. */}
      {shelf.gone > 0 && (
        <p className="mt-12 text-sm text-faint">
          {shelf.gone} {shelf.gone === 1 ? "thing you saved is" : "things you saved are"}{" "}
          no longer available — taken down, or made private by whoever wrote it.
        </p>
      )}
    </main>
  );
}
