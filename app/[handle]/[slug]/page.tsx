import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { excerpt, hasMoreThanOpening, openingOf } from "@/lib/story-doc";
import { METER_HEADER } from "@/lib/meter";
import { publicUrl } from "@/lib/storage";
import { StoryBody } from "@/components/StoryBody";
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

  const isPublic = row.story.status === "published";
  return {
    title: row.story.title || "Untitled",
    description: excerpt(row.story.excerpt || row.story.bodyText, 160),
    openGraph: row.cover
      ? { images: [{ url: publicUrl(row.cover.storageKey) }] }
      : undefined,
    // A draft is reachable by its author, so it must never be indexable.
    robots: isPublic ? undefined : { index: false, follow: false },
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

  // Same 404 as a missing story: a draft's existence shouldn't be probeable
  // by anyone but its author.
  if (story.status === "draft" && !isAuthor) notFound();

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
    // "bypass" with no viewer means a session cookie that no longer
    // resolves -- an expired session, which should be asked to sign in.
    // A missing header means the proxy did not run; fail open there.
    (meterVerdict === "exhausted" || meterVerdict === "bypass") &&
    hasMoreThanOpening(story.bodyJson);

  return (
    <main className="page flex-1 py-12 pb-24">
      {isAuthor && story.status !== "published" && (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <span>
            <strong className="font-medium">Draft</strong> — only you can see
            this.
          </span>
          <Link
            href={`/write/${story.id}`}
            className="font-medium text-accent underline underline-offset-2"
          >
            Continue editing
          </Link>
        </div>
      )}

      <article>
        <header className="max-w-5xl">
          {story.placeName && (
            <div className="mb-5">
              <PlaceMark
                place={story.placeName}
                countryCode={story.countryCode}
              />
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
                  <Avatar name={profile.displayName} handle={profile.handle} />
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

              <div className="mt-6">
                <ButtonLink
                  href={`/@${profile.handle}`}
                  variant="secondary"
                  size="sm"
                >
                  More stories
                </ButtonLink>
              </div>

              {isAuthor && (
                <p className="mt-6 text-sm text-muted">
                  <Link
                    href={`/write/${story.id}`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Edit this story
                  </Link>
                </p>
              )}
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
