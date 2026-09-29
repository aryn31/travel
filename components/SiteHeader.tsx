import Link from "next/link";
import { getViewer } from "@/lib/session";
import { Avatar } from "./ui/Avatar";
import { ButtonLink } from "./ui/Button";
import { HeaderShell } from "./HeaderShell";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <HeaderShell>
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Travel Stories
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {viewer ? (
            <>
              {viewer.profile ? (
                <>
                  <NavLink href="/write">Write</NavLink>
                  <NavLink href="/drafts">Stories</NavLink>
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
            </>
          ) : (
            <ButtonLink href="/signin" size="sm">
              Sign in
            </ButtonLink>
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
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </Link>
  );
}
