import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { excerpt } from "@/lib/story-doc";

export const metadata = { title: "Your stories" };

export default async function DraftsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  const rows = await db
    .select()
    .from(stories)
    .where(eq(stories.authorId, viewer.userId))
    .orderBy(desc(stories.updatedAt));

  const drafts = rows.filter((s) => s.status === "draft");
  const published = rows.filter((s) => s.status !== "draft");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your stories</h1>
        <Link
          href="/write"
          className="rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:opacity-85"
        >
          New story
        </Link>
      </div>

      {rows.length === 0 && (
        <p className="opacity-60">
          Nothing yet.{" "}
          <Link href="/write" className="underline">
            Start your first story
          </Link>
          .
        </p>
      )}

      <Section title="Drafts" empty="No drafts.">
        {drafts.map((s) => (
          <Row key={s.id} href={`/write/${s.id}`} story={s} />
        ))}
      </Section>

      <Section title="Published" empty="Nothing published yet.">
        {published.map((s) => (
          <Row
            key={s.id}
            href={`/@${viewer.profile!.handle}/${s.slug}`}
            story={s}
            editHref={`/write/${s.id}`}
          />
        ))}
      </Section>
    </main>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider opacity-40">
        {title}
      </h2>
      {children.length === 0 ? (
        <p className="text-sm opacity-40">{empty}</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/15">
          {children}
        </ul>
      )}
    </section>
  );
}

function Row({
  href,
  story,
  editHref,
}: {
  href: string;
  story: { title: string; bodyText: string; readingMinutes: number; updatedAt: Date };
  editHref?: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <Link href={href} className="min-w-0 flex-1 group">
        <span className="block font-medium group-hover:underline">
          {story.title.trim() || "Untitled"}
        </span>
        <span className="mt-0.5 block truncate text-sm opacity-50">
          {excerpt(story.bodyText, 90) || "Empty"}
        </span>
      </Link>
      <span className="shrink-0 text-xs opacity-40">
        {story.readingMinutes > 0 && `${story.readingMinutes} min · `}
        {story.updatedAt.toLocaleDateString()}
      </span>
      {editHref && (
        <Link href={editHref} className="shrink-0 text-xs underline opacity-50 hover:opacity-100">
          Edit
        </Link>
      )}
    </li>
  );
}
