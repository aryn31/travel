import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer, isModerator } from "@/lib/session";
import { recentActivity, siteSummary } from "@/lib/reports";
import { publicUrl } from "@/lib/storage";
import { firstQuote } from "@/lib/story-doc";
import { StoryList } from "@/components/StoryList";
import { HeroPhoto } from "@/components/HeroPhoto";
import { DestinationTicker } from "@/components/home/DestinationTicker";
import { StoryPair } from "@/components/home/StoryGrid";
import { StoryMosaic } from "@/components/home/StoryMosaic";
import { RotatingSeal } from "@/components/home/RotatingSeal";
import { QuoteBreak } from "@/components/home/QuoteBreak";
import { WritersRow } from "@/components/home/WritersRow";
import { WriteInvite } from "@/components/home/WriteInvite";
import { AdminHome } from "@/components/home/AdminHome";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/Reveal";

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();

  /*
   * A moderator gets a different page, not the same one with a panel
   * bolted on. The reader's home is an argument for reading -- a
   * full-height photograph, a lead story, a pull quote, an invitation to
   * write -- and none of that is what somebody running the site opened it
   * for.
   *
   * `?view=public` escapes back to it: the person running a site has to
   * be able to look at the thing everybody else sees, and without this
   * they would be the only person who never could.
   */
  const sp = await searchParams;
  if (isModerator(viewer) && viewer?.profile && sp.view !== "public") {
    const [summary, activity] = await Promise.all([
      siteSummary(),
      recentActivity(),
    ]);
    return (
      <AdminHome
        handle={viewer.profile.handle}
        summary={summary}
        activity={activity}
      />
    );
  }

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      excerpt: stories.excerpt,
      bodyText: stories.bodyText,
      bodyJson: stories.bodyJson,
      readingMinutes: stories.readingMinutes,
      publishedAt: stories.publishedAt,
      placeName: stories.placeName,
      countryCode: stories.countryCode,
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
    .where(and(eq(stories.status, "published"), isNull(stories.removedAt)))
    .orderBy(desc(stories.publishedAt))
    .limit(24);

  const recent = rows.map((r) => ({
    ...r,
    cover: r.coverKey
      ? {
          url: publicUrl(r.coverKey),
          width: r.coverWidth!,
          height: r.coverHeight!,
        }
      : null,
  }));

  const destinations = await db
    .select({
      code: sql<string>`${stories.countryCode}`.as("code"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(stories)
    .where(
      sql`${stories.status} = 'published' and ${stories.removedAt} is null and ${stories.countryCode} is not null`,
    )
    .groupBy(stories.countryCode)
    .orderBy(desc(sql`count(*)`))
    .limit(12);

  const writers = await db
    .select({
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
      bio: profiles.bio,
      homeCountry: profiles.homeCountry,
      stories: sql<number>`count(${stories.id})::int`.as("stories"),
      countries: sql<string[]>`
        array_remove(array_agg(distinct ${stories.countryCode}), null)
      `.as("countries"),
    })
    .from(profiles)
    .innerJoin(
      stories,
      sql`${stories.authorId} = ${profiles.userId} and ${stories.status} = 'published' and ${stories.removedAt} is null`,
    )
    .groupBy(
      profiles.handle,
      profiles.displayName,
      profiles.avatarKey,
      profiles.bio,
      profiles.homeCountry,
    )
    .orderBy(desc(sql`count(${stories.id})`))
    .limit(4);

  /*
   * A staff account cannot write, so "Write a story" is an invitation to
   * a page it has no business on. The rest of the page is unchanged: a
   * moderator is a reader first, and the site is not a dashboard.
   */
  const cta = !viewer
    ? { href: "/signin", label: "Start writing" }
    : viewer.profile
      ? { href: "/write", label: "Write a story" }
      : { href: "/onboarding", label: "Finish your profile" };

  // The page is built from modules that each do a different job, rather than
  // one card repeated: a lead, a pair, a voice, more stories, the people,
  // and an invitation.
  const [lead, ...rest] = recent;
  // Three across on a wide page; the grid collapses to two and then one.
  const trio = rest.slice(0, 3);
  const remainder = rest.slice(3);

  const quoted = recent.find((s) => firstQuote(s.bodyJson));
  const quote = quoted ? firstQuote(quoted.bodyJson) : null;

  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------------- *
       * Hero
       * ---------------------------------------------------------------- */}
      <section className="relative isolate -mt-16 flex min-h-[80vh] items-end overflow-hidden sm:min-h-[86vh]">
        <HeroPhoto className="absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden className="hero-veil" />
        <div aria-hidden className="hero-wash" />
        <div aria-hidden className="hero-foot" />
        <div aria-hidden className="hero-cap" />

        {/* Clear of the nav and of the copy column -- it sits in the empty
            sky on the right of the photograph. */}
        <RotatingSeal className="absolute right-12 top-44 hidden size-44 text-foreground/65 xl:block 2xl:right-20 2xl:size-52" />

        <div className="page hero-in pb-16 pt-32 sm:pb-24">
          <p className="eyebrow mb-4 text-foreground/60">
            Field notes from everywhere
          </p>
          <h1 className="font-display max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
            The places are the easy part.
            <span className="block text-accent">The telling is the rest.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/80">
            Long-form writing about where you went and what it was actually like
            — with the photographs that belong to it.
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

      {/* ------------------------------------------------------------ *
       * Destinations -- sand
       * ------------------------------------------------------------ */}
      {destinations.length > 0 && (
        <section className="band topo bg-tint-sand">
          <div className="page py-10">
            <Reveal>
              <h2 className="eyebrow mb-4">Where people have been</h2>
              <DestinationTicker destinations={destinations} />
            </Reveal>
          </div>
        </section>
      )}

      {recent.length === 0 ? (
        <div className="page py-16">
          <EmptyState title="Nothing published yet">
            The first story could be yours.
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Stories sit on plain background -- the photographs supply the
              colour here, and a tint behind them would fight. */}
          <section id="latest" className="page pt-16">
            <div className="mb-8 flex items-baseline gap-4">
              <span
                aria-hidden
                className="font-display numeral-outline text-4xl font-semibold leading-none"
              >
                01
              </span>
              <h2 className="eyebrow">The latest</h2>
              <span aria-hidden className="h-px flex-1 bg-rule" />
            </div>
            <Reveal>
              <StoryList stories={[lead]} featured />
            </Reveal>
          </section>

          {trio.length > 0 && (
            <section className="page mt-16">
              <Reveal>
                <StoryPair stories={trio} />
              </Reveal>
            </section>
          )}

          {/* ---------------------------------------------------------- *
           * Pull quote -- sea
           * ---------------------------------------------------------- */}
          {quote && quoted && (
            <section>
              <div>
                <Reveal>
                  <QuoteBreak
                    quote={quote}
                    title={quoted.title}
                    href={`/@${quoted.handle}/${quoted.slug}`}
                    authorName={quoted.displayName}
                    authorHandle={quoted.handle}
                    authorAvatarKey={quoted.avatarKey}
                  />
                </Reveal>
              </div>
            </section>
          )}

          {remainder.length > 0 && (
            <section className="page pt-16">
              <div className="mb-8 flex items-baseline gap-4">
                <span
                  aria-hidden
                  className="font-display numeral-outline text-4xl font-semibold leading-none"
                >
                  02
                </span>
                <h2 className="eyebrow">More stories</h2>
                <span aria-hidden className="h-px flex-1 bg-rule" />
              </div>
              <Reveal>
                <StoryMosaic stories={remainder} />
              </Reveal>
            </section>
          )}

          {/* ---------------------------------------------------------- *
           * Writers -- olive
           * ---------------------------------------------------------- */}
          <section className="band topo mt-20 bg-tint-olive">
            <div className="page py-20">
              <Reveal>
                <WritersRow writers={writers} />
              </Reveal>
            </div>
          </section>

          {/* ---------------------------------------------------------- *
           * Invitation -- clay
           * ---------------------------------------------------------- */}
          <section className="band topo bg-tint-clay">
            <div className="page py-24">
              <Reveal>
                <WriteInvite href={cta.href} />
              </Reveal>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
