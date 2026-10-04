import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/session";
import { listPeople } from "@/lib/reports";
import { RoleSelect } from "./RoleSelect";

export async function generateMetadata() {
  const viewer = await getViewer();
  // Same reason as /admin: a static title survives notFound() and names
  // the page to someone who is not allowed to see it.
  if (viewer?.role !== "admin") return {};
  return { title: "People", robots: { index: false, follow: false } };
}

/**
 * Who has an account, and what they are allowed to do.
 *
 * Admin only, not editor: moderating content and deciding who else gets
 * to moderate are different jobs, and the second one is the one that can
 * be used to take the site away from you.
 */
export default async function PeoplePage() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") notFound();

  // The report count lives in the header bar now, not on this page.
  const people = await listPeople();

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            People
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {people.length} {people.length === 1 ? "account" : "accounts"}
          </p>
        </div>
        <p className="max-w-sm text-xs text-faint">
          An editor can work the reports queue. An admin can do that and
          change these roles. You cannot change your own — use{" "}
          <code className="rounded bg-surface px-1">npm run admin</code> on the
          server.
        </p>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-rule text-left">
              <Th>Who</Th>
              <Th>Joined</Th>
              <Th>Published</Th>
              <Th>Comments</Th>
              <Th>Role</Th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.userId} className="border-b border-rule">
                <td className="py-3 pr-4">
                  {p.handle ? (
                    <Link
                      href={`/@${p.handle}`}
                      className="font-medium transition-colors hover:text-accent"
                    >
                      {p.displayName || p.handle}
                    </Link>
                  ) : (
                    <span className="text-faint">No profile yet</span>
                  )}
                  <span className="mt-0.5 block text-xs text-faint">
                    {p.email}
                  </span>
                </td>
                <td className="py-3 pr-4 text-muted">
                  {p.joined.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted">
                  {p.published}
                  {/* Only when there is something to say: a column of
                      zeroes reads as an accusation. */}
                  {p.removed > 0 && (
                    <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                      {p.removed} removed
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 tabular-nums text-muted">
                  {p.comments}
                </td>
                <td className="py-3">
                  <RoleSelect
                    userId={p.userId}
                    role={p.role}
                    isSelf={p.userId === viewer.userId}
                  />
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
