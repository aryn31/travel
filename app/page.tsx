import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { StoryList } from "@/components/StoryList";
import { HeroMountains } from "@/components/HeroMountains";

export default async function Home() {
  const viewer = await getViewer();

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
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
    .where(eq(stories.status, "published"))
    .orderBy(desc(stories.publishedAt))
    .limit(21);

  const recent = rows.map((r) => ({
    ...r,
    cover: r.coverKey
      ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
      : null,
  }));

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
      <section className="relative isolate -mt-16 flex min-h-[78vh] items-end overflow-hidden sm:min-h-[84vh]">
        <HeroMountains className="absolute inset-0 -z-10 h-full w-full" />

        {/* Only the last 10rem is washed into the page background. An
            all-over scrim flattened the ranges into a grey smear. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
        />
        {/* The header sits on sky, and sky brightness moves with the sun --
            this keeps the nav legible wherever the glow lands. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-background/75 to-transparent"
        />

        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-32 sm:pb-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
            Travel Stories
          </p>
          <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            The places are the easy part. The telling is the rest.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-foreground/80">
            Long-form writing about where you went and what it was actually
            like — with the photographs that belong to it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={cta.href}
              className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-85"
            >
              {cta.label}
            </Link>
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
       * Stories
       * ---------------------------------------------------------------- */}
      <section id="latest" className="mx-auto w-full max-w-3xl px-6 pb-24">
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rule px-8 py-16 text-center">
            <p className="text-lg">Nothing published yet.</p>
            <p className="mt-2 text-muted">The first story could be yours.</p>
          </div>
        ) : (
          <>
            <h2 className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Latest
            </h2>

            <StoryList stories={[lead]} featured />

            {rest.length > 0 && (
              <div className="mt-4 border-t border-rule">
                <StoryList stories={rest} />
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
