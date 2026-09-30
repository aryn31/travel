import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { StoryList } from "@/components/StoryList";
import { HeroPhoto } from "@/components/HeroPhoto";
import { DestinationStrip } from "@/components/DestinationStrip";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function Home() {
  const viewer = await getViewer();

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      excerpt: stories.excerpt,
      bodyText: stories.bodyText,
      readingMinutes: stories.readingMinutes,
      publishedAt: stories.publishedAt,
      placeName: stories.placeName,
      countryCode: stories.countryCode,
      handle: profiles.handle,
      displayName: profiles.displayName,
      coverKey: media.storageKey,
      coverWidth: media.width,
      coverHeight: media.height,
    })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(eq(stories.status, "published"))
    .orderBy(desc(stories.publishedAt))
    .limit(21);

  const recent = rows.map((r) => ({
    ...r,
    cover: r.coverKey
      ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
      : null,
  }));

  // One row per country. Discovery and decoration at the same time.
  const destinations = await db
    .select({
      code: sql<string>`${stories.countryCode}`.as("code"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(stories)
    .where(
      sql`${stories.status} = 'published' and ${stories.countryCode} is not null`,
    )
    .groupBy(stories.countryCode)
    .orderBy(desc(sql`count(*)`))
    .limit(12);

  const [lead, ...rest] = recent;

  const cta = !viewer
    ? { href: "/signin", label: "Start writing" }
    : viewer.profile
      ? { href: "/write", label: "Write a story" }
      : { href: "/onboarding", label: "Finish your profile" };

  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------------- *
       * Hero
       * ---------------------------------------------------------------- */}
      <section className="relative isolate -mt-16 flex min-h-[80vh] items-end overflow-hidden sm:min-h-[86vh]">
        <HeroPhoto className="absolute inset-0 -z-10 h-full w-full object-cover" />

        {/* See .hero-veil / .hero-wash / .hero-foot in globals.css. */}
        <div aria-hidden className="hero-veil" />
        <div aria-hidden className="hero-wash" />
        <div aria-hidden className="hero-foot" />

        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-32 sm:pb-24">
          <p className="eyebrow mb-4 text-foreground/60">
            Field notes from everywhere
          </p>
          <h1 className="font-display max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
            The places are the easy part.
            <span className="block text-accent">The telling is the rest.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/80">
            Long-form writing about where you went and what it was actually
            like — with the photographs that belong to it.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href={cta.href} size="lg">
              {cta.label}
            </ButtonLink>
            {recent.length > 0 && (
              <a
                href="#latest"
                className="rounded-full px-4 py-3 text-foreground/70 transition-colors hover:text-foreground"
              >
                Read the latest ↓
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- *
       * Destinations
       * ---------------------------------------------------------------- */}
      {destinations.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-4 pt-12">
          <h2 className="eyebrow mb-4">Where people have been</h2>
          <DestinationStrip destinations={destinations} />
        </section>
      )}

      {/* ---------------------------------------------------------------- *
       * Stories
       * ---------------------------------------------------------------- */}
      <section id="latest" className="mx-auto w-full max-w-3xl px-6 pb-24 pt-10">
        {recent.length === 0 ? (
          <EmptyState title="Nothing published yet">
            The first story could be yours.
          </EmptyState>
        ) : (
          <>
            <div className="mb-8 flex items-baseline gap-4">
              <h2 className="eyebrow">Latest</h2>
              <span aria-hidden className="h-px flex-1 bg-rule" />
            </div>

            <StoryList stories={[lead]} featured />

            {rest.length > 0 && (
              <div className="mt-12 border-t border-rule">
                <StoryList stories={rest} />
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
