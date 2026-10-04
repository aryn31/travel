import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer, isModerator } from "@/lib/session";
import {
  isFrozen,
  isListed,
  isReadable,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
} from "@/lib/visibility";
import { excerpt, hasMoreThanOpening, openingOf } from "@/lib/story-doc";
import { METER_HEADER } from "@/lib/meter";
import { publicUrl } from "@/lib/storage";
import { hasLiked } from "@/lib/likes";
import { isSaved } from "@/lib/saves";
import { alreadyReported } from "@/lib/reports";
import { placementsOf } from "@/lib/collections";
import { TripNav } from "@/components/TripNav";
import { TripAside } from "@/components/TripAside";
import { ReportButton } from "@/components/report/ReportButton";
import { listComments } from "@/lib/comments";
import { tagsForStory } from "@/lib/tags";
import { StoryBody } from "@/components/StoryBody";
import { LikeButton } from "@/components/LikeButton";
import { SaveButton } from "@/components/SaveButton";
import { Comments } from "@/components/comments/Comments";
import { TagChip } from "@/components/ui/TagChip";
import { ReadWall } from "@/components/ReadWall";
import { Avatar } from "@/components/ui/Avatar";
import { PlaceMark } from "@/components/ui/PlaceMark";
import { ButtonLink } from "@/components/ui/Button";

async function load(handleSegment: string, slug: string) {
  const raw = decodeURIComponent(handleSegment);
  if (!raw.startsWith("@")) return null;

  const [row] = await db
    .select({ story: stories, profile: profiles, cover: media })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(
      and(
        sql`lower(${profiles.handle}) = ${raw.slice(1).toLowerCase()}`,
        eq(stories.slug, slug),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[handle]/[slug]">) {
  const { handle, slug } = await params;
  const row = await load(handle, slug);
  if (!row) return {};

  return {
    title: row.story.title || "Untitled",
    description: excerpt(row.story.excerpt || row.story.bodyText, 160),
    openGraph: row.cover
      ? { images: [{ url: publicUrl(row.cover.storageKey) }] }
      : undefined,
    /*
     * Only a listed story is indexable. An unlisted one is readable by
     * anyone holding the link, which is exactly why it must not be found
     * any other way -- being crawled would undo the only thing the state
     * is for. Drafts and private stories are the author's alone.
     */
    robots:
      isListed(row.story.status) && !row.story.removedAt
        ? undefined
        : { index: false, follow: false },
  };
}

export default async function StoryPage({
  params,
}: PageProps<"/[handle]/[slug]">) {
  const { handle, slug } = await params;
  const row = await load(handle, slug);
  if (!row) notFound();

  const { story, profile, cover } = row;
  const viewer = await getViewer();
  const isAuthor = viewer?.userId === story.authorId;

  /*
   * Same 404 as a missing story: whether a draft or a private story exists
   * at this URL should not be probeable by anyone but its author. Unlisted
   * is the one non-public state that does answer -- that is its whole
   * purpose.
   */
  if (!isAuthor && !isReadable(story.status)) notFound();

  /*
   * Taken down by a moderator. The author keeps the row and can still read
   * it -- so they can see what was removed and appeal -- and so can a
   * moderator, who otherwise could not review their own decision. Gone for
   * everyone else, whatever its status says.
   */
  const maySeeRemoved = isAuthor || isModerator(viewer);
  if (!maySeeRemoved && story.removedAt) notFound();

  /*
   * The free-read meter. proxy.ts counts the read and reports what the
   * cookie said; the decision is made here, because only this side knows
   * whether the viewer is real. A signed-in reader is never walled, and a
   * session cookie that no longer resolves to a viewer is treated as signed
   * out -- which is the right answer for an expired session.
   *
   * Walling a story with barely more than its opening would withhold almost
   * nothing and annoy the reader for it, so short pieces stay open.
   */
  const meterVerdict = (await headers()).get(METER_HEADER);
  const walled =
    !viewer &&
    /*
     * The meter governs the public archive. Walling an unlisted story
     * would break the one thing someone chose that state to do -- hand the
     * link to a person who does not have an account.
     */
    isListed(story.status) &&
    // "bypass" with no viewer means a session cookie that no longer
    // resolves -- an expired session, which should be asked to sign in.
    // A missing header means the proxy did not run; fail open there.
    (meterVerdict === "exhausted" || meterVerdict === "bypass") &&
    hasMoreThanOpening(story.bodyJson);

  /*
   * Only for a published story. A draft has no audience, so its likes and
   * comments are both empty by construction and the queries are waste.
   */
  /*
   * Likes and comments need somebody other than the author able to reach
   * the page. A private story has an audience of one, and a draft none.
   */
  const live = isReadable(story.status) && !story.removedAt;
  const [liked, saved, comments, storyTagList, reported, placements] =
    await Promise.all([
    live ? hasLiked(story.id, viewer?.userId ?? null) : false,
    live ? isSaved({ kind: "story", id: story.id }, viewer?.userId ?? null) : false,
    live ? listComments(story.id, viewer?.userId ?? null) : [],
    tagsForStory(story.id),
    live ? alreadyReported({ kind: "story", id: story.id }, viewer?.userId ?? null) : false,
    // Only for a story anyone can reach: a draft's place in a trip is the
    // author's business, and the neighbours would be links they cannot use.
    live ? placementsOf(story.id) : [],
  ]);

  const path = `/@${profile.handle}/${story.slug}`;

  return (
    <main className="page flex-1 py-12 pb-24">
      {/* What the author is looking at, when it is not the public page.
          Named per state rather than "Draft" for all three -- "only you can
          see this" is simply false for an unlisted story. */}
      {maySeeRemoved && story.removedAt && (
        <div className="mb-10 rounded-xl border-2 border-dashed border-red-500/40 bg-red-500/5 px-4 py-3 text-sm">
          <strong className="font-medium">Removed by a moderator.</strong>{" "}
          <span className="text-muted">
            {isAuthor
              ? "Only you can see this page. Reply to the contact form if you think that is wrong."
              : "Hidden from everyone but its author. You can see it because you moderate."}
          </span>
        </div>
      )}

      {isAuthor && !story.removedAt && !isListed(story.status) && (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <span>
            <strong className="font-medium">
              {VISIBILITY_LABEL[story.status]}
            </strong>{" "}
            — {VISIBILITY_HINT[story.status]}
          </span>
          <Link
            href={`/write/${story.id}`}
            className="font-medium text-accent underline underline-offset-2"
          >
            {isFrozen(story.status) ? "Manage this story" : "Continue editing"}
          </Link>
        </div>
      )}

      <article>
        <header className="max-w-5xl">
          {(story.placeName || storyTagList.length > 0) && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {story.placeName && (
                <PlaceMark
                  place={story.placeName}
                  countryCode={story.countryCode}
                />
              )}
              {storyTagList.map((t) => (
                <TagChip key={t.slug} slug={t.slug} label={t.label} />
              ))}
            </div>
          )}
          <h1 className="font-display text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {story.title || "Untitled"}
          </h1>
        </header>

        {cover && (
          <figure className="mt-10 -mx-6 sm:mx-0 lg:-mx-10">
            {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
            <img
              src={publicUrl(cover.storageKey)}
              alt=""
              width={cover.width}
              height={cover.height}
              className="h-auto w-full sm:rounded-xl"
            />
          </figure>
        )}

        {/*
          Full page width, with the byline moved into a column beside the
          prose rather than stacked above it. That fills the page without
          setting paragraphs at 130 characters a line -- the type steps up a
          size as well, so the wider column still reads at a sane measure.
        */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
          <div className="min-w-0">
            {/* The withheld blocks are never serialised into the page --
                a CSS-only fade is one Reader Mode away from nothing. */}
            <StoryBody doc={walled ? openingOf(story.bodyJson) : story.bodyJson} />
            {walled && (
              <ReadWall
                title={story.title}
                authorName={profile.displayName}
                handle={profile.handle}
                slug={story.slug}
              />
            )}
          </div>

          <aside className="lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center gap-3 border-t border-rule pt-5 lg:border-0 lg:pt-0">
                <Link href={`/@${profile.handle}`} className="shrink-0">
                  <Avatar
                    name={profile.displayName}
                    handle={profile.handle}
                    avatarKey={profile.avatarKey}
                  />
                </Link>
                <div className="min-w-0 text-sm leading-tight">
                  <p className="eyebrow">Written by</p>
                  <Link
                    href={`/@${profile.handle}`}
                    className="font-display mt-1 block text-base font-semibold transition-colors hover:text-accent"
                  >
                    {profile.displayName}
                  </Link>
                </div>
              </div>

              {profile.bio && (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {profile.bio}
                </p>
              )}

              {/* Above the dates and the counts: landing mid-trip is the
                  most useful thing this column can tell a reader, and it
                  is shown even behind the read wall -- it is a reason to
                  sign in, not something being withheld. */}
              <TripAside placements={placements} />

              <dl className="mt-5 space-y-1.5 border-t border-rule pt-5 text-sm text-muted">
                {story.publishedAt && (
                  <div>
                    <dt className="sr-only">Published</dt>
                    <dd>
                      <time dateTime={story.publishedAt.toISOString()}>
                        {story.publishedAt.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </dd>
                  </div>
                )}
                {story.readingMinutes > 0 && (
                  <div>
                    <dt className="sr-only">Reading time</dt>
                    <dd>{story.readingMinutes} min read</dd>
                  </div>
                )}
              </dl>

              {/* Only on something anyone can read. Liking your own unlisted
                  draft is not a feature. */}
              {live && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <LikeButton
                    storyId={story.id}
                    initialLiked={liked}
                    initialCount={story.likeCount}
                    signedIn={Boolean(viewer)}
                    size="sm"
                  />
                  <SaveButton
                    target={{ kind: "story", id: story.id }}
                    initialSaved={saved}
                    signedIn={Boolean(viewer)}
                    size="sm"
                  />
                  <a
                    href="#comments"
                    className="text-sm text-muted transition-colors hover:text-accent"
                  >
                    {story.commentCount === 1
                      ? "1 comment"
                      : `${story.commentCount} comments`}
                  </a>
                </div>
              )}

              <div className="mt-6">
                <ButtonLink
                  href={`/@${profile.handle}`}
                  variant="secondary"
                  size="sm"
                >
                  More stories
                </ButtonLink>
              </div>

              {/* Not offered to the author: they can take their own story
                  down without involving anyone. */}
              {live && !isAuthor && (
                <p className="mt-6">
                  <ReportButton
                    target={{ kind: "story", id: story.id }}
                    alreadyReported={reported}
                    signedIn={Boolean(viewer)}
                  />
                </p>
              )}

              {isAuthor && (
                <p className="mt-6 text-sm text-muted">
                  <Link
                    href={`/write/${story.id}`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {/* Published is frozen, so this page is where you go
                        to take it down, not to change it. */}
                    {isFrozen(story.status)
                      ? "Manage this story"
                      : "Continue editing"}
                  </Link>
                </p>
              )}
            </div>
          </aside>
        </div>
      </article>

      {/* Below the article, above the comments: finish the part, then go
          to the next one. Hidden behind the wall for the same reason the
          comments are. */}
      {!walled && <TripNav placements={placements} />}

      {/* Not behind the wall: someone who has not read the story has
          nothing to say about it, and the comments would spoil what the
          wall is withholding. */}
      {live && !walled && (
        <Comments
          storyId={story.id}
          path={path}
          comments={comments}
          total={story.commentCount}
          signedIn={Boolean(viewer)}
          needsProfile={Boolean(viewer && !viewer.profile)}
        />
      )}
    </main>
  );
}
