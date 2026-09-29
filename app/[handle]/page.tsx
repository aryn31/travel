import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { StoryList } from "@/components/StoryList";

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

  const published = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      bodyText: stories.bodyText,
      readingMinutes: stories.readingMinutes,
      publishedAt: stories.publishedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(
      and(
        eq(stories.authorId, profile.userId),
        eq(stories.status, "published"),
      ),
    )
    .orderBy(desc(stories.publishedAt));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {profile.displayName}
          </h1>
          <p className="mt-1 opacity-60">@{profile.handle}</p>
        </div>
        {isMe && (
          <Link href="/drafts" className="shrink-0 text-sm underline opacity-60 hover:opacity-100">
            Your stories
          </Link>
        )}
      </div>
      {profile.bio && <p className="mt-4 leading-relaxed">{profile.bio}</p>}

      <hr className="my-10 border-black/10 dark:border-white/15" />

      {published.length === 0 ? (
        <p className="text-sm opacity-60">
          {isMe ? (
            <>
              Nothing published yet.{" "}
              <Link href="/write" className="underline">
                Write your first story
              </Link>
              .
            </>
          ) : (
            "No stories yet."
          )}
        </p>
      ) : (
        <StoryList stories={published} showAuthor={false} />
      )}
    </main>
  );
}
