import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { excerpt } from "@/lib/story-doc";
import { publicUrl } from "@/lib/storage";
import { StoryBody } from "@/components/StoryBody";
import { Avatar } from "@/components/ui/Avatar";
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
    description: excerpt(row.story.bodyText, 160),
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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 pb-24">
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
        <header>
          <h1 className="text-balance text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">
            {story.title || "Untitled"}
          </h1>

          <div className="mt-7 flex items-center gap-3">
            <Link href={`/@${profile.handle}`} className="shrink-0">
              <Avatar name={profile.displayName} handle={profile.handle} />
            </Link>
            <div className="text-sm leading-tight">
              <Link
                href={`/@${profile.handle}`}
                className="font-medium transition-colors hover:text-accent"
              >
                {profile.displayName}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-muted">
                {story.publishedAt && (
                  <time dateTime={story.publishedAt.toISOString()}>
                    {story.publishedAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
                {story.readingMinutes > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{story.readingMinutes} min read</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        {cover && (
          <figure className="mt-10 -mx-6 sm:mx-0">
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

        <div className="mt-8">
          <StoryBody doc={story.bodyJson} />
        </div>
      </article>

      {/* Author card: the end of a story is the one moment a reader is most
          likely to want more from the same person. */}
      <aside className="mt-16 rounded-2xl border border-rule bg-surface p-6">
        <div className="flex items-start gap-4">
          <Avatar name={profile.displayName} handle={profile.handle} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">
              Written by
            </p>
            <p className="mt-1 font-medium">{profile.displayName}</p>
            {profile.bio && (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {profile.bio}
              </p>
            )}
          </div>
          <ButtonLink
            href={`/@${profile.handle}`}
            variant="secondary"
            size="sm"
            className="shrink-0"
          >
            More stories
          </ButtonLink>
        </div>
      </aside>

      {isAuthor && story.status === "published" && (
        <p className="mt-8 text-sm text-muted">
          <Link href={`/write/${story.id}`} className="underline underline-offset-2">
            Edit this story
          </Link>
        </p>
      )}
    </main>
  );
}
