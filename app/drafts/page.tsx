import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { media, stories } from "@/lib/db/schema";
import { getViewer, isModerator } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { excerpt } from "@/lib/story-doc";
import { isListed, isReadable } from "@/lib/visibility";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Your stories" };

export default async function DraftsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");
  /* Staff accounts do not write -- see isModerator in lib/session.ts. A
     redirect rather than a 404: the page plainly exists, it is just not
     this account's business, and sending them where they belong is more
     use than pretending otherwise. */
  if (isModerator(viewer)) redirect("/admin");

  const rows = await db
    .select({ story: stories, cover: media })
    .from(stories)
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(eq(stories.authorId, viewer.userId))
    .orderBy(desc(stories.updatedAt));

  /*
   * Grouped by what each state means to the author rather than by the enum:
   * "out" is everything someone else could reach, "yours" is everything
   * only you can. A private story belongs with the drafts in that sense,
   * but it is labelled so it is not mistaken for one.
   */
  const yours = rows.filter((r) => !isReadable(r.story.status));
  const out = rows.filter((r) => isReadable(r.story.status));
  const published = rows.filter((r) => isListed(r.story.status));
  const handle = viewer.profile.handle;

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your stories</h1>
          <p className="mt-1.5 text-sm text-muted">
            {published.length} published · {out.length - published.length}{" "}
            unlisted · {yours.length} not shared
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/settings" variant="secondary">
            Edit profile
          </ButtonLink>
          <ButtonLink href="/write">New story</ButtonLink>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="Nothing here yet">
            Every story starts as a private draft.{" "}
            <Link href="/write" className="text-accent underline underline-offset-2">
              Start your first
            </Link>
            .
          </EmptyState>
        </div>
      ) : (
        <div className="mt-12 space-y-14">
          <Section
            title="Only you"
            count={yours.length}
            empty="No drafts right now."
          >
            {yours.map(({ story, cover }) => (
              <StoryRow
                key={story.id}
                href={`/write/${story.id}`}
                story={story}
                cover={cover}
                badge={story.status === "private" ? "Private" : undefined}
              />
            ))}
          </Section>

          <Section
            title="Out there"
            count={out.length}
            empty="Nothing published yet."
          >
            {out.map(({ story, cover }) => (
              <StoryRow
                key={story.id}
                href={`/@${handle}/${story.slug}`}
                badge={story.status === "unlisted" ? "Unlisted" : undefined}
                editHref={`/write/${story.id}`}
                /* "Edit" would be a promise this page cannot keep: a
                   published story opens read-only and has to be unpublished
                   first. */
                editLabel="Manage"
                story={story}
                cover={cover}
              />
            ))}
          </Section>
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section>
      <h2 className="eyebrow mb-1 flex items-baseline gap-2">
        {title}
        <span className="text-faint">{count}</span>
      </h2>
      {children.length === 0 ? (
        <p className="py-5 text-sm text-faint">{empty}</p>
      ) : (
        <ul className="divide-y divide-rule">{children}</ul>
      )}
    </section>
  );
}

function StoryRow({
  href,
  editHref,
  editLabel,
  badge,
  story,
  cover,
}: {
  href: string;
  editHref?: string;
  editLabel?: string;
  /** Set only where the section heading does not already say it. */
  badge?: string;
  story: {
    title: string;
    excerpt: string;
    bodyText: string;
    readingMinutes: number;
    updatedAt: Date;
    status: string;
  };
  cover: { storageKey: string; width: number; height: number } | null;
}) {
  return (
    <li className="group flex items-center gap-4 py-4">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- see StoryBody
        <img
          src={publicUrl(cover.storageKey)}
          alt=""
          width={cover.width}
          height={cover.height}
          className="h-16 w-24 shrink-0 rounded-lg bg-rule object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="h-16 w-24 shrink-0 rounded-lg border border-dashed border-rule"
        />
      )}

      <Link href={href} className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium group-hover:underline">
            {story.title.trim() || "Untitled"}
          </span>
          {badge && (
            <span className="shrink-0 rounded-full border border-rule px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-faint">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted">
          {excerpt(story.excerpt || story.bodyText, 90) || "Empty"}
        </span>
        <span className="mt-1 block text-xs text-faint">
          {story.readingMinutes > 0 && `${story.readingMinutes} min · `}
          Edited {story.updatedAt.toLocaleDateString()}
        </span>
      </Link>

      {editHref && (
        <Link
          href={editHref}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {editLabel ?? "Edit"}
        </Link>
      )}
    </li>
  );
}
