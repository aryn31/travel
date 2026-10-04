import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer, isModerator } from "@/lib/session";
import { entriesOf, findBySlug } from "@/lib/collections";
import { isSaved } from "@/lib/saves";
import { alreadyReported } from "@/lib/reports";
import { ReportButton } from "@/components/report/ReportButton";
import { SaveButton } from "@/components/SaveButton";
import { isListed, isReadable } from "@/lib/visibility";
import { StoryList } from "@/components/StoryList";
import { Avatar } from "@/components/ui/Avatar";
import { flagFor } from "@/components/ui/PlaceMark";
import { excerpt } from "@/lib/story-doc";

async function load(handleSegment: string, slug: string) {
  const raw = decodeURIComponent(handleSegment);
  if (!raw.startsWith("@")) return null;
  return findBySlug(raw.slice(1), slug);
}

export async function generateMetadata({
  params,
}: PageProps<"/[handle]/trips/[slug]">) {
  const { handle, slug } = await params;
  const row = await load(handle, slug);
  if (!row) return {};

  return {
    title: row.collection.title || "Trip",
    description: row.collection.description
      ? excerpt(row.collection.description, 160)
      : `A trip by ${row.profile.displayName} on Wendfolk.`,
    robots:
      isListed(row.collection.status) && !row.collection.removedAt
        ? undefined
        : { index: false, follow: false },
  };
}

/**
 * A trip, read end to end.
 *
 * Same visibility rules as a story -- draft and private are the owner's
 * alone, unlisted answers to anyone with the link -- because collections
 * reuse `story_status` precisely so these two pages can agree.
 */
export default async function TripPage({
  params,
}: PageProps<"/[handle]/trips/[slug]">) {
  const { handle, slug } = await params;
  const viewer = await getViewer();

  const raw = decodeURIComponent(handle);
  if (!raw.startsWith("@")) notFound();

  const row = await load(handle, slug);
  if (!row) notFound();

  const { collection, profile } = row;
  const isOwner = viewer?.userId === collection.ownerId;
  if (!isOwner && !isReadable(collection.status)) notFound();

  // Taken down: the owner and a moderator can still open it, nobody else.
  const maySeeRemoved = isOwner || isModerator(viewer);
  if (!maySeeRemoved && collection.removedAt) notFound();

  const entries = await entriesOf(collection.id, isOwner);
  /* Not offered on your own trip: it is already on /collections. */
  const [saved, reported] = isOwner
    ? [false, false]
    : await Promise.all([
        isSaved({ kind: "collection", id: collection.id }, viewer?.userId ?? null),
        alreadyReported(
          { kind: "collection", id: collection.id },
          viewer?.userId ?? null,
        ),
      ]);

  /*
   * Members only, like the archive and profiles -- a trip is a way through
   * the archive, so it would be odd for it to be the one open door.
   * Individual stories stay reachable; the free-read meter governs those.
   */
  if (!viewer) {
    redirect(`/signin?next=${encodeURIComponent(`/${raw}/trips/${slug}`)}`);
  }

  const countries = [
    ...new Set(entries.map((e) => e.countryCode).filter(Boolean)),
  ] as string[];
  const minutes = entries.reduce((n, e) => n + e.readingMinutes, 0);

  return (
    <main className="flex-1">
      {maySeeRemoved && collection.removedAt && (
        <div className="page pt-8">
          <div className="rounded-xl border-2 border-dashed border-red-500/40 bg-red-500/5 px-4 py-3 text-sm">
            <strong className="font-medium">Removed by a moderator.</strong>{" "}
            <span className="text-muted">
              {isOwner
                ? "Only you can see this page. Reply to the contact form if you think that is wrong."
                : "Hidden from everyone but its owner. You can see it because you moderate."}
            </span>
          </div>
        </div>
      )}

      <section className="band topo bg-tint-sand">
        <div className="page py-14">
          <div className="flex items-baseline gap-4">
            <h2 className="eyebrow">A trip</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>

          <h1 className="font-display mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            {collection.title || "Untitled trip"}
          </h1>

          {collection.description && (
            <p className="font-display mt-6 max-w-2xl text-balance text-2xl leading-snug text-muted">
              {collection.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
            <Link
              href={`/@${profile.handle}`}
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <Avatar
                name={profile.displayName}
                handle={profile.handle}
                avatarKey={profile.avatarKey}
                size="sm"
              />
              {profile.displayName}
            </Link>
            <span>
              {entries.length} {entries.length === 1 ? "part" : "parts"}
              {minutes > 0 && ` · ${minutes} min in all`}
            </span>
            {countries.length > 0 && (
              <span aria-hidden className="flex items-center gap-1.5">
                {countries.map((code) => (
                  <span key={code} className="text-base leading-none">
                    {flagFor(code)}
                  </span>
                ))}
              </span>
            )}
            {isOwner ? (
              <Link
                href={`/collections/${collection.id}`}
                className="text-accent underline underline-offset-4"
              >
                Edit this trip
              </Link>
            ) : (
              <>
                <SaveButton
                  target={{ kind: "collection", id: collection.id }}
                  initialSaved={saved}
                  signedIn={Boolean(viewer)}
                  size="sm"
                />
                {/* A trip has a title and a description of its own, so it
                    is text that can need reporting on its own. */}
                <ReportButton
                  target={{ kind: "collection", id: collection.id }}
                  alreadyReported={reported}
                  signedIn={Boolean(viewer)}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="page py-12 pb-24">
        {entries.length === 0 ? (
          <p className="py-6 text-muted">Nothing in this trip yet.</p>
        ) : (
          /*
           * Numbered, because the order is the point. The row layout is the
           * archive's, so a trip reads like a section of the site rather
           * than a different product.
           */
          <ol className="max-w-4xl">
            {entries.map((e, i) => (
              <li
                key={e.id}
                className="flex gap-5 border-t border-rule first:border-0 sm:gap-8"
              >
                <span
                  aria-hidden
                  className="font-display w-10 shrink-0 pt-8 text-right text-2xl font-semibold tabular-nums text-faint"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <StoryList stories={[e]} showAuthor={false} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
