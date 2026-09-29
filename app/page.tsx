import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { StoryList } from "@/components/StoryList";

export default async function Home() {
  const viewer = await getViewer();

  const recent = await db
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
    .where(eq(stories.status, "published"))
    .orderBy(desc(stories.publishedAt))
    .limit(20);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Travel stories, told properly.
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed opacity-70">
        Long-form writing about places, with the photos that belong to it.
      </p>

      <div className="mt-8">
        {viewer ? (
          viewer.profile ? (
            <Link
              href="/write"
              className="inline-block rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-85"
            >
              Write a story
            </Link>
          ) : (
            <Link
              href="/onboarding"
              className="inline-block rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-85"
            >
              Finish setting up your profile
            </Link>
          )
        ) : (
          <Link
            href="/signin"
            className="inline-block rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-85"
          >
            Start writing
          </Link>
        )}
      </div>

      <hr className="my-12 border-black/10 dark:border-white/15" />

      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider opacity-40">
        Latest
      </h2>
      {recent.length === 0 ? (
        <p className="py-6 opacity-50">
          Nothing published yet. The first story could be yours.
        </p>
      ) : (
        <StoryList stories={recent} />
      )}
    </main>
  );
}
