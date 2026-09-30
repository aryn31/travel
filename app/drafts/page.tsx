import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { media, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { excerpt } from "@/lib/story-doc";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Your stories" };

export default async function DraftsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  const rows = await db
    .select({ story: stories, cover: media })
    .from(stories)
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(eq(stories.authorId, viewer.userId))
    .orderBy(desc(stories.updatedAt));

  const drafts = rows.filter((r) => r.story.status === "draft");
  const published = rows.filter((r) => r.story.status !== "draft");
  const handle = viewer.profile.handle;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your stories</h1>
          <p className="mt-1.5 text-sm text-muted">
            {published.length} published · {drafts.length}{" "}
            {drafts.length === 1 ? "draft" : "drafts"}
          </p>
        </div>
        <ButtonLink href="/write">New story</ButtonLink>
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
          <Section title="Drafts" count={drafts.length} empty="No drafts right now.">
            {drafts.map(({ story, cover }) => (
              <StoryRow
                key={story.id}
                href={`/write/${story.id}`}
                story={story}
                cover={cover}
              />
            ))}
          </Section>

          <Section
            title="Published"
            count={published.length}
            empty="Nothing published yet."
          >
            {published.map(({ story, cover }) => (
              <StoryRow
                key={story.id}
                href={`/@${handle}/${story.slug}`}
                editHref={`/write/${story.id}`}
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
  story,
  cover,
}: {
  href: string;
  editHref?: string;
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
          className="size-14 shrink-0 rounded-lg bg-rule object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="size-14 shrink-0 rounded-lg border border-dashed border-rule"
        />
      )}

      <Link href={href} className="min-w-0 flex-1">
        <span className="block truncate font-medium group-hover:underline">
          {story.title.trim() || "Untitled"}
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
          Edit
        </Link>
      )}
    </li>
  );
}
