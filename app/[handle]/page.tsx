import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { StoryList } from "@/components/StoryList";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

async function loadProfile(segment: string) {
  const raw = decodeURIComponent(segment);
  if (!raw.startsWith("@")) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(sql`lower(${profiles.handle}) = ${raw.slice(1).toLowerCase()}`)
    .limit(1);

  return profile ?? null;
}

export async function generateMetadata({ params }: PageProps<"/[handle]">) {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) return {};
  return {
    title: profile.displayName,
    description: profile.bio ?? `Travel stories by @${profile.handle}.`,
  };
}

/**
 * Matches the first path segment, so it only handles /@handle -- anything
 * without the @ is a 404. Static routes (/signin, /drafts) take precedence
 * over this dynamic segment, which is why the namespace in lib/handles.ts
 * has to stay reserved.
 */
export default async function ProfilePage({ params }: PageProps<"/[handle]">) {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) notFound();

  const viewer = await getViewer();
  const isMe = viewer?.userId === profile.userId;

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      excerpt: stories.excerpt,
      bodyText: stories.bodyText,
      readingMinutes: stories.readingMinutes,
      publishedAt: stories.publishedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
      coverKey: media.storageKey,
      coverWidth: media.width,
      coverHeight: media.height,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(
      and(
        eq(stories.authorId, profile.userId),
        eq(stories.status, "published"),
      ),
    )
    .orderBy(desc(stories.publishedAt));

  const published = rows.map((r) => ({
    ...r,
    cover: r.coverKey
      ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
      : null,
  }));

  return (
    <main className="flex-1">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar name={profile.displayName} handle={profile.handle} size="lg" />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {profile.displayName}
                </h1>
                <p className="mt-1 text-muted">@{profile.handle}</p>
              </div>
            </div>
            {isMe && (
              <ButtonLink href="/drafts" variant="secondary" size="sm">
                Your stories
              </ButtonLink>
            )}
          </div>

          {profile.bio && (
            <p className="mt-6 max-w-prose leading-relaxed">{profile.bio}</p>
          )}

          <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-muted">
            <div className="flex gap-1.5">
              <dt className="sr-only">Stories published</dt>
              <dd className="font-medium text-foreground">{published.length}</dd>
              <span>{published.length === 1 ? "story" : "stories"}</span>
            </div>
            {profile.homeCountry && (
              <div className="flex gap-1.5">
                <dt className="sr-only">Based in</dt>
                <dd>Based in {profile.homeCountry}</dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="sr-only">Joined</dt>
              <dd>
                Joined{" "}
                {profile.createdAt.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-10 pb-24">
        {published.length === 0 ? (
          <EmptyState title={isMe ? "Nothing published yet" : "No stories yet"}>
            {isMe ? (
              <>
                Drafts stay private until you publish them.{" "}
                <Link href="/write" className="text-accent underline underline-offset-2">
                  Write your first story
                </Link>
                .
              </>
            ) : (
              <>Check back another time.</>
            )}
          </EmptyState>
        ) : (
          <StoryList stories={published} showAuthor={false} />
        )}
      </div>
    </main>
  );
}
