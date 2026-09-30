import Link from "next/link";
import { getViewer } from "@/lib/session";
import { Avatar } from "./ui/Avatar";
import { ButtonLink } from "./ui/Button";
import { HeaderShell } from "./HeaderShell";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <HeaderShell>
      <div className="page flex items-center justify-between py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Travel Stories
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {/* Public and first, so the archive is reachable without an
              account -- it is the main way in for anyone not signed in. */}
          <NavLink href="/stories">Stories</NavLink>
          {viewer ? (
            <>
              {viewer.profile ? (
                <>
                  <NavLink href="/write">Write</NavLink>
                  <NavLink href="/drafts">Yours</NavLink>
                  <NavLink href={`/@${viewer.profile.handle}`}>
                    <Avatar
                      name={viewer.profile.displayName}
                      handle={viewer.profile.handle}
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-foreground/75 transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </Link>
  );
}
