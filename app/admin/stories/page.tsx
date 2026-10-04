import Link from "next/link";
import { notFound } from "next/navigation";
import { getModerator } from "@/lib/session";
import { listAllStories } from "@/lib/reports";
import { VISIBILITY_LABEL, type Visibility } from "@/lib/visibility";
import { StoryActions } from "./StoryActions";

export async function generateMetadata() {
  const viewer = await getModerator();
  // Static metadata survives notFound() and names the page -- see /admin.
  if (!viewer) return {};
  return { title: "Stories", robots: { index: false, follow: false } };
}

/**
 * Every story, searchable, with a way to act on any of them.
 *
 * The reports queue can only reach what somebody flagged. This is how a
 * moderator finds the thing nobody reported.
 */
export default async function AdminStoriesPage({
  searchParams,
}: PageProps<"/admin/stories">) {
  const viewer = await getModerator();
  if (!viewer) notFound();

  const raw = await searchParams;
  const q = (typeof raw.q === "string" ? raw.q : "").trim().slice(0, 80);
  const rows = await listAllStories(q || null);

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Stories
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {rows.length}
            {rows.length === 100 && "+"} shown
            {q && ` matching “${q}”`}
          </p>
        </div>

        {/* A plain GET form: every search here is a shareable URL, and it
            works with no JavaScript, same as /stories. */}
        <form action="/admin/stories" method="get" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search by title or author
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Title or author…"
            className="rounded-full border-2 border-rule bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Find
          </button>
        </form>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-rule text-left">
              <Th>Story</Th>
              <Th>Author</Th>
              <Th>State</Th>
              <Th>Likes</Th>
              <Th>Comments</Th>
              <Th>Updated</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-rule">
                <td className="py-3 pr-4">
                  <Link
                    href={s.href}
                    className="font-medium transition-colors hover:text-accent"
                  >
                    {s.title}
                  </Link>
                  {/* Only when there are any: a zero on every row is noise
                      in the column that should be read first. */}
                  {s.reports > 0 && (
                    <span className="ml-2 text-xs text-accent">
                      {s.reports} reported
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/@${s.authorHandle}`}
                    className="text-muted transition-colors hover:text-foreground"
                  >
                    {s.authorName}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  {s.removed ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      Removed
                    </span>
                  ) : (
                    <span className="text-muted">
                      {VISIBILITY_LABEL[s.status as Visibility]}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted">
                  {s.likeCount}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted">
                  {s.commentCount}
                </td>
                <td className="py-3 pr-4 text-muted">
                  {s.updatedAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </td>
                <td className="py-3">
                  <StoryActions storyId={s.id} removed={s.removed} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pb-2 pr-4 font-medium text-faint">{children}</th>;
}
