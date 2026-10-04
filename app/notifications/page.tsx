import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { listFor, unreadCount } from "@/lib/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarkAllRead } from "./MarkAllRead";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

import type { Kind } from "@/lib/notifications";

/**
 * How each line reads.
 *
 * The moderation ones have no actor, so they are written to stand on
 * their own rather than after a name -- "A moderator removed", not
 * "[nobody] removed".
 */
const VERB: Record<Kind, string> = {
  like: "liked",
  comment: "commented on",
  reply: "replied to you on",
  removed: "was taken down by a moderator",
  restored: "was put back by a moderator",
};

/** The two that are about a decision rather than a person. */
function isModeration(kind: Kind): boolean {
  return kind === "removed" || kind === "restored";
}

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=%2Fnotifications");
  if (!viewer.profile) redirect("/onboarding");

  const [items, unread] = await Promise.all([
    listFor(viewer.userId),
    unreadCount(viewer.userId),
  ]);

  return (
    <main className="page flex-1 py-12 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {items.length === 0
              ? "Nothing yet."
              : unread > 0
                ? `${unread} new`
                : "All caught up."}
          </p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      {items.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="Nothing yet">
            When somebody likes or replies to your writing, it lands here.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-10 max-w-3xl divide-y divide-rule border-y border-rule">
          {items.map((n) => (
            <li
              key={n.id}
              /* Unread is a tint on the row rather than a dot beside it:
                 the thing being drawn attention to is the line itself. */
              className={`flex gap-4 px-3 py-5 ${
                n.read ? "" : "-mx-3 rounded-lg bg-accent-soft/50"
              }`}
            >
              {n.actor ? (
                <Link href={`/@${n.actor.handle}`} className="shrink-0">
                  <Avatar
                    name={n.actor.name}
                    handle={n.actor.handle}
                    avatarKey={n.actor.avatarKey}
                    size="sm"
                  />
                </Link>
              ) : (
                <span
                  aria-hidden
                  className={`inline-grid size-8 shrink-0 place-items-center rounded-full ${
                    isModeration(n.kind)
                      ? "bg-plum/15 text-plum"
                      : "bg-rule"
                  }`}
                >
                  {isModeration(n.kind) && (
                    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
                      <path d="M8 1 2.5 3.2v4.4c0 3.3 2.2 6.3 5.5 7.4 3.3-1.1 5.5-4.1 5.5-7.4V3.2Z" />
                    </svg>
                  )}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">
                  {isModeration(n.kind) ? (
                    /* Subject first: what happened to it is the news, and
                       the thing it happened to is how you know which. */
                    <>
                      {n.story ? (
                        <Link
                          href={n.story.href}
                          className="font-medium underline decoration-rule underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {n.story.title}
                        </Link>
                      ) : (
                        <span className="font-medium">Something of yours</span>
                      )}{" "}
                      <span className="text-muted">{VERB[n.kind]}</span>
                      {n.kind === "removed" && (
                        <span className="text-muted">
                          {". "}
                          Only you can see it now.{" "}
                          <Link
                            href="/contact"
                            className="underline underline-offset-4"
                          >
                            Get in touch
                          </Link>{" "}
                          if you think that is wrong.
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {n.actor ? (
                        <Link
                          href={`/@${n.actor.handle}`}
                          className="font-medium transition-colors hover:text-accent"
                        >
                          {n.actor.name}
                        </Link>
                      ) : (
                        <span className="font-medium">Someone</span>
                      )}{" "}
                      <span className="text-muted">{VERB[n.kind]}</span>{" "}
                      {n.story ? (
                        <Link
                          href={n.story.href}
                          className="font-medium underline decoration-rule underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {n.story.title}
                        </Link>
                      ) : (
                        <span className="text-faint">a story that is gone</span>
                      )}
                    </>
                  )}
                </p>

                {n.excerpt && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                    “{n.excerpt}”
                  </p>
                )}

                <time
                  dateTime={n.createdAt.toISOString()}
                  className="mt-1 block text-xs text-faint"
                >
                  {n.createdAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
