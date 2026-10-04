import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { RotatingSeal } from "./RotatingSeal";

/**
 * What a moderator opens instead of the reader's front page.
 *
 * The home page is an argument for reading -- a photograph the height of
 * the window, a lead story, a pull quote, an invitation to write. None of
 * that is what somebody running the site came for, and dressing a queue
 * up as a magazine cover helps nobody.
 *
 * So: the one urgent thing first, the shape of the site second, what has
 * happened lately third. The reader's page is still a click away, because
 * the person running a site should be able to look at it.
 */
export function AdminHome({
  handle,
  summary,
  activity,
}: {
  handle: string;
  summary: {
    open: number;
    stories: number;
    trips: number;
    removed: number;
    people: number;
  };
  activity: {
    stories: {
      title: string;
      href: string;
      author: string;
      publishedAt: Date | null;
      removed: boolean;
    }[];
    people: {
      handle: string;
      displayName: string;
      avatarKey: string | null;
      joined: Date;
      stories: number;
    }[];
  };
}) {
  const quiet = summary.open === 0;

  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------ *
       * The one thing that might be urgent
       * ------------------------------------------------------------ */}
      <section
        className={`band topo ${quiet ? "bg-tint-sand" : "bg-accent-soft"}`}
      >
        <div className="page relative py-14">
          <RotatingSeal className="absolute right-8 top-10 hidden size-40 text-foreground/10 lg:block" />

          <div className="flex items-baseline gap-4">
            <h2 className="eyebrow">Signed in as @{handle}</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>

          <h1 className="font-display mt-5 max-w-3xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            {quiet ? (
              <>
                Nothing is waiting.
                <span className="text-muted"> The site is running itself.</span>
              </>
            ) : (
              <>
                {summary.open} {summary.open === 1 ? "report" : "reports"}{" "}
                <span className="text-accent">
                  {summary.open === 1 ? "needs" : "need"} you.
                </span>
              </>
            )}
          </h1>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
            >
              {quiet ? "Open the back office" : "Work the queue"}
            </Link>
            {/* The escape hatch. Somebody running a site has to be able to
                see the thing everybody else sees. */}
            <Link
              href="/?view=public"
              className="rounded-full border-2 border-foreground/20 px-5 py-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              See what readers see →
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ *
       * The shape of the site
       * ------------------------------------------------------------ */}
      <section className="page py-12">
        <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <Tile href="/admin/stories" value={summary.stories} label="published stories" />
          <Tile href="/admin/trips" value={summary.trips} label="trips" />
          <Tile href="/admin/people" value={summary.people} label="accounts" />
          <Tile
            href="/admin/stories"
            value={summary.removed}
            label={summary.removed === 1 ? "thing taken down" : "things taken down"}
            muted={summary.removed === 0}
          />
        </dl>
      </section>

      {/* ------------------------------------------------------------ *
       * Lately
       * ------------------------------------------------------------ */}
      <section className="page grid gap-12 border-t border-rule py-12 pb-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="mb-5 flex items-baseline gap-4">
            <h2 className="eyebrow">Just published</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          {activity.stories.length === 0 ? (
            <p className="text-sm text-faint">Nothing published yet.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {activity.stories.map((s) => (
                <li key={s.href} className="py-3">
                  <Link
                    href={s.href}
                    className="font-medium transition-colors hover:text-accent"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-faint">
                    {s.author}
                    {s.publishedAt &&
                      ` · ${s.publishedAt.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}`}
                    {s.removed && (
                      <span className="text-red-600 dark:text-red-400">
                        {" "}
                        · removed
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-5 flex items-baseline gap-4">
            <h2 className="eyebrow">Newest accounts</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          <ul className="divide-y divide-rule">
            {activity.people.map((p) => (
              <li key={p.handle} className="flex items-center gap-3 py-3">
                <Avatar
                  name={p.displayName}
                  handle={p.handle}
                  avatarKey={p.avatarKey}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/@${p.handle}`}
                    className="block truncate font-medium transition-colors hover:text-accent"
                  >
                    {p.displayName}
                  </Link>
                  <p className="text-xs text-faint">
                    joined{" "}
                    {p.joined.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {/* The number that matters when watching for spam: an
                        account that published on the day it joined. */}
                    {p.stories > 0 &&
                      ` · ${p.stories} published`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Tile({
  href,
  value,
  label,
  muted,
}: {
  href: string;
  value: number;
  label: string;
  /** Dimmed at zero: nothing taken down is good news, not a headline. */
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border-2 border-rule bg-surface/60 p-5 transition-colors hover:border-accent/50 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <dd className="font-display text-4xl font-semibold leading-none tracking-tight">
        {value}
      </dd>
      <dt className="mt-2 text-xs uppercase tracking-[0.14em] text-muted group-hover:text-foreground">
        {label}
      </dt>
    </Link>
  );
}
