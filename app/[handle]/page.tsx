import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { StoryList } from "@/components/StoryList";
import { ProfileHeader } from "@/components/ProfileHeader";
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
    description: profile.bio ?? `Travel stories by @${profile.handle} on Wendfolk.`,
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
  const viewer = await getViewer();

  /*
   * Members only, like the archive. Individual stories stay open -- the
   * free-read meter governs those -- so a shared link still works for a
   * stranger; it is the people pages and the archive that an account buys.
   *
   * Checked before the profile is loaded: answering "no such person" to a
   * signed-out visitor would make this a way to test which handles exist
   * without ever having an account.
   *
   * The shape check comes first so a mistyped path still 404s -- otherwise
   * every unmatched top-level URL falls into this route and answers with a
   * sign-in form, which is a strange thing for /abuot to do. And the
   * segment arrives percent-encoded ("%40mira"), so it is decoded before
   * going back into `next`; encoding it as-is produced /@%40mira.
   */
  const raw = decodeURIComponent(handle);
  if (!raw.startsWith("@")) notFound();

  if (!viewer) {
    redirect(`/signin?next=${encodeURIComponent(`/${raw}`)}`);
  }

  const profile = await loadProfile(handle);
  if (!profile) notFound();

  const isMe = viewer.userId === profile.userId;

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      excerpt: stories.excerpt,
      bodyText: stories.bodyText,
      placeName: stories.placeName,
      countryCode: stories.countryCode,
      readingMinutes: stories.readingMinutes,
      publishedAt: stories.publishedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
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

  /* Derived here rather than queried: the rows are already loaded, and a
     second round trip to Supabase to count what is in memory is latency
     for nothing. */
  const countries = [...new Set(published.map((p) => p.countryCode).filter(Boolean))] as string[];
  const minutes = published.reduce((n, p) => n + p.readingMinutes, 0);
  const [newest, ...rest] = published;

  return (
    <main className="flex-1">
      <ProfileHeader
        profile={profile}
        stats={{ stories: published.length, countries, minutes }}
        isMe={isMe}
      />

      <div className="page py-10 pb-24">
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
          <>
            {/* The newest at poster size, the rest as rows -- the same
                hierarchy the home page uses, so a profile does not read as
                an undifferentiated list of everything. */}
            <StoryList stories={[newest]} showAuthor={false} featured />

            {rest.length > 0 && (
              <section className="mt-16">
                <div className="mb-6 flex items-baseline gap-4">
                  <h2 className="eyebrow">Earlier</h2>
                  <span aria-hidden className="h-px flex-1 bg-rule" />
                </div>
                <StoryList stories={rest} showAuthor={false} />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
