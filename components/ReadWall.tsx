import Link from "next/link";
import { FREE_READS } from "@/lib/meter";

/**
 * Shown in place of the rest of a story once a signed-out reader has used
 * their free read.
 *
 * The opening paragraphs stay visible above this and fade into it, so the
 * page still reads as a story rather than a locked door. That fade is a
 * gradient sitting on top of the prose -- the withheld text is never sent
 * to the browser at all, because a CSS-only wall is one Reader Mode away
 * from not existing.
 */
export function ReadWall({
  title,
  authorName,
  handle,
  slug,
}: {
  title: string;
  authorName: string;
  handle: string;
  slug: string;
}) {
  // Come back to the story after signing in, rather than to the home page.
  const next = encodeURIComponent(`/@${handle}/${slug}`);

  return (
    <div className="relative">
      {/* Covers the last of the visible prose. -mt pulls it up over the
          bottom of the teaser; pointer-events-none so a half-faded line is
          still selectable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-transparent to-background"
      />

      <div className="perforate relative isolate mt-4 bg-sea px-6 py-14 text-background sm:px-10 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-background/70">
            That was your free read
          </p>

          <h2 className="font-display mt-4 text-balance text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            The rest of {authorName}&apos;s story is waiting.
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-background/85">
            Reading is free — an account is just how we know it&apos;s you.
            Make one and finish{" "}
            <span className="font-medium">“{title || "this story"}”</span>,
            then read everything else here too.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/signup?next=${next}`}
              className="rounded-full bg-background px-6 py-3 font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            >
              Create a free account
            </Link>
            <Link
              href={`/signin?next=${next}`}
              className="rounded-full border-2 border-background/40 px-5 py-3 font-medium transition-colors hover:border-background"
            >
              I already have one
            </Link>
          </div>

          <p className="mt-8 text-sm text-background/70">
            {FREE_READS === 1
              ? "Signed-out visitors get one story."
              : `Signed-out visitors get ${FREE_READS} stories.`}{" "}
            <Link href="/stories" className="underline underline-offset-2">
              Browse the rest
            </Link>{" "}
            any time.
          </p>
        </div>
      </div>
    </div>
  );
}
