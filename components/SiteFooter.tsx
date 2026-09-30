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
                Travel Stories
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
                  <FooterLink href="/stories">All stories</FooterLink>
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
            <p>Set in Fraunces and Geist.</p>
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
