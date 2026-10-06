import Link from "next/link";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block text-muted transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}

/**
 * A masthead rather than a rule with two links under it. The colour bar is
 * the six-hue palette printed edge to edge, which is also the only place on
 * the site where all six appear together.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div aria-hidden className="flex h-2.5">
        <span className="flex-1 bg-accent" />
        <span className="flex-1 bg-sun" />
        <span className="flex-1 bg-moss" />
        <span className="flex-1 bg-sea" />
        <span className="flex-1 bg-indigo" />
        <span className="flex-1 bg-plum" />
      </div>

      <div className="topo bg-surface">
        <div className="page py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr] lg:gap-16">
            <div>
              <p className="font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
                Wendfolk
              </p>
              <p className="mt-5 max-w-sm text-lg leading-relaxed text-muted">
                Places, properly told — long-form writing about where you went
                and what it was actually like.
              </p>
            </div>

            <nav aria-label="Read">
              <p className="eyebrow mb-4">Read</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <FooterLink href="/">Home</FooterLink>
                </li>
                <li>
                  <FooterLink href="/#latest">The latest</FooterLink>
                </li>
              </ul>
            </nav>

            <nav aria-label="Write">
              <p className="eyebrow mb-4">Write</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <FooterLink href="/write">Start a story</FooterLink>
                </li>
                <li>
                  <FooterLink href="/drafts">Your stories</FooterLink>
                </li>
                <li>
                  <FooterLink href="/signin">Sign in</FooterLink>
                </li>
                <li>
                  <FooterLink href="/signup">Create account</FooterLink>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-6 text-xs leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Deliberately in the bottom bar rather than a column: a way
                  to reach a person is the last thing someone looks for, and
                  the last place they look is here. */}
              <Link
                href="/contact"
                className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                Contact us
              </Link>
              {/* The three a reader is entitled to find without asking. */}
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link
                href="/content-policy"
                className="transition-colors hover:text-foreground"
              >
                House rules
              </Link>
              <span>Set in Fraunces and Geist.</span>
            </p>
            {/* The seeded photographs come from Commons under CC licences,
                and those licences require the credit to appear somewhere. */}
            <p>
              Photographs from Wikimedia Commons, used under their respective
              Creative Commons licences.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
