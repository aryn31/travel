import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="page flex flex-col gap-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-display text-base font-semibold text-foreground">Travel Stories</span>
          {" — "}places, properly told.
        </p>
        <nav className="flex flex-wrap items-center gap-5">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link href="/write" className="transition-colors hover:text-foreground">
            Write
          </Link>
        </nav>
      </div>
    </footer>
  );
}
