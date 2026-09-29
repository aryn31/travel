import Link from "next/link";
import { getViewer } from "@/lib/session";
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
        <nav className="flex items-center gap-4">
          {viewer ? (
            <>
              {viewer.profile ? (
                <>
                  <Link href="/write" className="text-sm text-muted transition-colors hover:text-foreground">
                    Write
                  </Link>
                  <Link href="/drafts" className="text-sm text-muted transition-colors hover:text-foreground">
                    Stories
                  </Link>
                  <Link
                    href={`/@${viewer.profile.handle}`}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    @{viewer.profile.handle}
                  </Link>
                </>
              ) : (
                <Link href="/onboarding" className="text-sm text-muted transition-colors hover:text-foreground">
                  Finish setup
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <Link href="/signin" className="text-sm font-medium transition-opacity hover:opacity-70">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </HeaderShell>
  );
}
