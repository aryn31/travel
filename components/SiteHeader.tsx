import Link from "next/link";
import { getViewer } from "@/lib/session";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Travel Stories
        </Link>
        <nav className="flex items-center gap-4">
          {viewer ? (
            <>
              {viewer.profile ? (
                <Link
                  href={`/@${viewer.profile.handle}`}
                  className="text-sm opacity-60 hover:opacity-100"
                >
                  @{viewer.profile.handle}
                </Link>
              ) : (
                <Link href="/onboarding" className="text-sm opacity-60 hover:opacity-100">
                  Finish setup
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <Link href="/signin" className="text-sm font-medium hover:opacity-70">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
