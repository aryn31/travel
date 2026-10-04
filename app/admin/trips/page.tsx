import Link from "next/link";
import { notFound } from "next/navigation";
import { getModerator } from "@/lib/session";
import { listAllTrips } from "@/lib/reports";
import { VISIBILITY_LABEL, type Visibility } from "@/lib/visibility";
import { TripActions } from "./TripActions";

export async function generateMetadata() {
  const viewer = await getModerator();
  // Static metadata survives notFound() and names the page -- see /admin.
  if (!viewer) return {};
  return { title: "Trips", robots: { index: false, follow: false } };
}

/** Every collection, with a way to act on any of them. */
export default async function AdminTripsPage({
  searchParams,
}: PageProps<"/admin/trips">) {
  const viewer = await getModerator();
  if (!viewer) notFound();

  const raw = await searchParams;
  const q = (typeof raw.q === "string" ? raw.q : "").trim().slice(0, 80);
  const rows = await listAllTrips(q || null);

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Trips
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {rows.length} shown{q && ` matching “${q}”`}
          </p>
        </div>

        <form action="/admin/trips" method="get" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search by title or owner
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Title or owner…"
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

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">Nothing here.</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-rule text-left">
                <Th>Trip</Th>
                <Th>Owner</Th>
                <Th>State</Th>
                <Th>Parts</Th>
                <Th>Updated</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-rule">
                  <td className="py-3 pr-4">
                    <Link
                      href={t.href}
                      className="font-medium transition-colors hover:text-accent"
                    >
                      {t.title}
                    </Link>
                    {t.reports > 0 && (
                      <span className="ml-2 text-xs text-accent">
                        {t.reports} reported
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/@${t.ownerHandle}`}
                      className="text-muted transition-colors hover:text-foreground"
                    >
                      {t.ownerName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    {t.removed ? (
                      <span className="font-medium text-red-600 dark:text-red-400">
                        Removed
                      </span>
                    ) : (
                      <span className="text-muted">
                        {VISIBILITY_LABEL[t.status as Visibility]}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-muted">
                    {t.parts}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {t.updatedAt.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="py-3">
                    <TripActions collectionId={t.id} removed={t.removed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pb-2 pr-4 font-medium text-faint">{children}</th>;
}
