import Link from "next/link";

/**
 * The shell the three policy pages share.
 *
 * A narrow measure and the site's own typography rather than a wall of
 * centred legalese. Somebody who opens these has a question, and the
 * fastest way to answer it is for the page to be readable.
 *
 * `updated` is shown because a policy with no date is a policy nobody can
 * tell has changed.
 */
export function LegalPage({
  eyebrow,
  title,
  summary,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  /** The plain-English version, before the careful version. */
  summary: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <section className="band topo bg-tint-sand">
        <div className="page py-14">
          <div className="flex items-baseline gap-4">
            <h2 className="eyebrow">{eyebrow}</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          <h1 className="font-display mt-5 max-w-3xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="font-display mt-6 max-w-2xl text-balance text-2xl leading-snug text-muted">
            {summary}
          </p>
          <p className="mt-6 text-sm text-faint">Last updated {updated}</p>
        </div>
      </section>

      {/* prose-none is the site's own reading styles; the policy pages get
          the same measure and rhythm as a story. */}
      <section className="page py-12 pb-24">
        <div className="reading prose-none max-w-2xl">{children}</div>

        <nav className="mt-16 flex flex-wrap gap-5 border-t border-rule pt-6 text-sm">
          <Link href="/terms" className="text-muted hover:text-accent">
            Terms
          </Link>
          <Link href="/privacy" className="text-muted hover:text-accent">
            Privacy
          </Link>
          <Link href="/content-policy" className="text-muted hover:text-accent">
            What is allowed
          </Link>
          <Link href="/contact" className="text-muted hover:text-accent">
            Contact
          </Link>
        </nav>
      </section>
    </main>
  );
}

/** A draft marker. Removed when the words have been read by somebody. */
export function Draft() {
  return (
    <p className="mb-8 rounded-xl border-2 border-dashed border-accent/40 bg-accent-soft px-4 py-3 text-sm not-prose">
      <strong className="font-medium">Draft.</strong>{" "}
      <span className="text-muted">
        Written to describe accurately what this site does. It has not been
        reviewed by a lawyer, and should be before the site takes money or
        opens to strangers.
      </span>
    </p>
  );
}
