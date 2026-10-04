import Link from "next/link";
import { getViewer, isModerator } from "@/lib/session";
import { openReportCount } from "@/lib/reports";
import { unreadCount } from "@/lib/notifications";
import { Avatar } from "./ui/Avatar";
import { ButtonLink } from "./ui/Button";
import { HeaderShell } from "./HeaderShell";
import { HeaderSwitch } from "./HeaderSwitch";
import { AdminBar } from "./AdminBar";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { RoleBadge } from "./ui/RoleBadge";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const viewer = await getViewer();
  // Only asked for when there is somebody to ask for; a reader never pays
  // for this query.
  const waiting = isModerator(viewer) ? await openReportCount() : 0;
  const unread = viewer?.profile ? await unreadCount(viewer.userId) : 0;

  const moderator = isModerator(viewer);

  const site = (
      <div className="page flex items-center justify-between py-4">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
          Wendfolk
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {/* Members only (app/stories/page.tsx), so it is only offered to
              people who can actually open it. A link that always bounces to
              a sign-in form is worse than no link. */}
          {viewer?.profile && <NavLink href="/stories">Stories</NavLink>}
          {viewer ? (
            <>
              {viewer.profile ? (
                <>
                  {/*
                   * A staff account administers; it does not write. The
                   * separation is the whole reason for having one, and a
                   * header full of writing tools on an account that is not
                   * for writing is the thing that makes it look like an
                   * ordinary reader with a badge.
                   *
                   * The routes still answer if typed -- this hides the
                   * offer, it does not revoke the ability, so an admin who
                   * also writes loses nothing by being demoted back.
                   */}
                  {moderator ? (
                    <NavLink href="/admin">Back office</NavLink>
                  ) : (
                    <>
                      <NavLink href="/write">Write</NavLink>
                      <NavLink href="/drafts">Yours</NavLink>
                      <NavLink href="/collections">Trips</NavLink>
                      <NavLink href="/saved">Saved</NavLink>
                    </>
                  )}

                  {/* Kept for staff too: a moderator who replies to
                      somebody still needs to know when they reply back. */}
                  <NavLink href="/notifications" exact>
                    <span className="relative inline-flex">
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        className="size-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                        <path d="M10.3 20a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                      {unread > 0 && (
                        <span
                          aria-hidden
                          className="absolute -right-1 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-background"
                        />
                      )}
                    </span>
                    <span className="sr-only">
                      Notifications
                      {unread > 0 ? ` (${unread} new)` : ""}
                    </span>
                  </NavLink>

                  <NavLink href={`/@${viewer.profile.handle}`} exact>
                    <Avatar
                      name={viewer.profile.displayName}
                      handle={viewer.profile.handle}
                      avatarKey={viewer.profile.avatarKey}
                      size="sm"
                    />
                    <span className="hidden sm:inline">
                      @{viewer.profile.handle}
                    </span>
                    <RoleBadge role={viewer.role} size="sm" />
                  </NavLink>
                </>
              ) : (
                <NavLink href="/onboarding">Finish setup</NavLink>
              )}
              <SignOutButton />
              <ThemeToggle />
            </>
          ) : (
            <>
              <ThemeToggle />
              <NavLink href="/signin">Sign in</NavLink>
              <ButtonLink href="/signup" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
  );

  /*
   * Only built for somebody who can open the admin area. For everyone
   * else the switch never has a second tree to choose, which is also why
   * an ordinary reader is never handed its markup.
   */
  const admin =
    moderator && viewer?.profile ? (
      <AdminBar
        handle={viewer.profile.handle}
        role={viewer.role}
        open={waiting}
        isAdmin={viewer.role === "admin"}
        avatar={
          <Avatar
            name={viewer.profile.displayName}
            handle={viewer.profile.handle}
            avatarKey={viewer.profile.avatarKey}
            size="sm"
          />
        }
        signOut={<SignOutButton />}
        theme={<ThemeToggle />}
      />
    ) : null;

  return (
    <HeaderShell>
      {admin ? <HeaderSwitch site={site} admin={admin} /> : site}
    </HeaderShell>
  );
}
