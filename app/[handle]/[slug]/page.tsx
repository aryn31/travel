import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { excerpt } from "@/lib/story-doc";
import { publicUrl } from "@/lib/storage";
import { StoryBody } from "@/components/StoryBody";

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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      {isAuthor && story.status !== "published" && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15">
          <span className="opacity-70">
            This is a draft — only you can see it.
          </span>
          <Link href={`/write/${story.id}`} className="underline">
            Edit
          </Link>
        </div>
      )}

      <article>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">
          {story.title || "Untitled"}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm opacity-60">
          <Link href={`/@${profile.handle}`} className="hover:underline">
            {profile.displayName}
          </Link>
          {story.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={story.publishedAt.toISOString()}>
                {story.publishedAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </>
          )}
          {story.readingMinutes > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{story.readingMinutes} min read</span>
            </>
          )}
        </div>

        {cover && (
          <figure className="mt-10 -mx-6 sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
            <img
              src={publicUrl(cover.storageKey)}
              alt=""
              width={cover.width}
              height={cover.height}
              className="h-auto w-full sm:rounded-lg"
            />
          </figure>
        )}

        <div className="mt-6">
          <StoryBody doc={story.bodyJson} />
        </div>
      </article>

      {isAuthor && story.status === "published" && (
        <p className="mt-12 text-sm opacity-50">
          <Link href={`/write/${story.id}`} className="underline">
            Edit this story
          </Link>
        </p>
      )}
    </main>
  );
}
