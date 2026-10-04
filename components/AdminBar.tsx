import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./NavLink";

/**
 * The back office wears its own chrome.
 *
 * The reader's nav -- Write, Trips, Saved, the notification bell -- is
 * for the person using the site. None of it is any use while taking a
 * story down, and leaving it there made the admin area look like just
 * another page you happened to be on.
 *
 * The one link back is deliberate and prominent: the way out of a tool
 * should never be something you have to go looking for.
 */
export function AdminBar({
  handle,
  role,
  open,
  isAdmin,
  avatar,
  signOut,
  theme,
}: {
  handle: string;
  role: string;
  /** Unresolved reports, so the count is visible from every admin page. */
  open: number;
  isAdmin: boolean;
  /** Server-rendered, passed through -- see SiteHeader. */
  avatar: ReactNode;
  signOut: ReactNode;
  theme: ReactNode;
}) {
  return (
    <div className="page flex flex-wrap items-center justify-between gap-y-3 py-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2.5">
          <span className="font-display text-2xl font-semibold tracking-tight">
            Wendfolk
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-plum/40 bg-plum/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-plum">
            <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="currentColor">
              <path d="M8 1 2.5 3.2v4.4c0 3.3 2.2 6.3 5.5 7.4 3.3-1.1 5.5-4.1 5.5-7.4V3.2Z" />
            </svg>
            Back office
          </span>
        </span>

        <nav className="flex items-center gap-1 text-sm" aria-label="Admin">
          <NavLink href="/admin" exact>
            Reports
            {open > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-background">
                {open}
              </span>
            )}
          </NavLink>
          <NavLink href="/admin/stories">Stories</NavLink>
          <NavLink href="/admin/trips">Trips</NavLink>
          {/* Roles are an admin's business, not an editor's. */}
          {isAdmin && <NavLink href="/admin/people">People</NavLink>}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {/* Not "/" any more: that is the moderator's own front page now,
            so "back to the site" would have led back to the back office. */}
        <Link
          href="/?view=public"
          className="rounded-full border-2 border-rule px-3.5 py-1.5 transition-colors hover:border-accent/50 hover:text-accent"
        >
          ← See the site
        </Link>
        <span className="hidden items-center gap-2 text-muted sm:flex">
          {avatar}
          @{handle}
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-plum">
            {role}
          </span>
        </span>
        {signOut}
        {theme}
      </div>
    </div>
  );
}
