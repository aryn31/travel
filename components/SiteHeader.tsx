import Link from "next/link";
import { getViewer } from "@/lib/session";
import { Avatar } from "./ui/Avatar";
import { ButtonLink } from "./ui/Button";
import { HeaderShell } from "./HeaderShell";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <HeaderShell>
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
                  <NavLink href="/write">Write</NavLink>
                  <NavLink href="/drafts">Yours</NavLink>
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
    </HeaderShell>
  );
}
