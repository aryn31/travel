import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

/**
 * A line from one of the stories, given a full-width band of solid colour.
 *
 * Earlier versions ran a three-stop gradient through the panel; vermilion
 * into plum turns muddy where they meet, and no amount of shape fixed that.
 * One flat colour, big type and a stamp-perforated edge does more with less.
 *
 * The band is --sea in both themes, which is dark in light mode and light in
 * dark mode, so the type is simply --background either way and the contrast
 * holds without a second set of rules.
 */
export function QuoteBreak({
  quote,
  title,
  href,
  authorName,
  authorHandle,
  authorAvatarKey,
}: {
  quote: string;
  title: string;
  href: string;
  authorName: string;
  authorHandle: string;
  authorAvatarKey: string | null;
}) {
  return (
    <div className="perforate relative isolate my-20 bg-sea text-background">
      {/* Huge glyph as a watermark rather than a label -- it fills the space
          the text does not use, which is what the old panel lacked. */}
      <svg
        aria-hidden
        viewBox="0 0 40 28"
        className="pointer-events-none absolute -top-4 left-4 h-40 w-56 fill-current opacity-10 sm:left-12 sm:h-56 sm:w-80"
      >
        <path d="M0 28V15.6C0 7.4 4.6 1.7 13.3 0l1.8 4.2c-4.6 1.4-6.9 4-7.2 7.4H16V28H0Zm24 0V15.6C24 7.4 28.6 1.7 37.3 0l1.8 4.2c-4.6 1.4-6.9 4-7.2 7.4H40V28H24Z" />
      </svg>

      <div className="page relative py-20 text-center sm:py-28">
        {/* Not .eyebrow: that class hard-codes color: var(--muted), which is
            calibrated against the page, not against a saturated band. */}
        <p className="mb-8 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-background/80">
          From the stories
        </p>

        <blockquote className="mx-auto max-w-5xl">
          <p className="font-display text-balance text-3xl leading-[1.18] sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            {quote}
          </p>

          <footer className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Avatar
              name={authorName}
              handle={authorHandle}
              avatarKey={authorAvatarKey}
              size="sm"
            />
            <Link href={`/@${authorHandle}`} className="font-semibold hover:underline">
              {authorName}
            </Link>
            <span aria-hidden className="opacity-50">·</span>
            <Link
              href={href}
              className="underline underline-offset-4 opacity-80 hover:opacity-100"
            >
              {title}
            </Link>
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
