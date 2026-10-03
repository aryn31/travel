import Link from "next/link";

/**
 * Place and country, drawn from the fields a story already carries. Standing
 * in for the map that arrives in phase 2 -- and the reason this reads as
 * travel rather than as a generic blog.
 */

/** ISO 3166-1 alpha-2 → flag, by offsetting into the regional indicators. */
function flagFor(code: string): string | null {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  return String.fromCodePoint(
    ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function PlaceMark({
  place,
  countryCode,
  size = "md",
  href,
}: {
  place: string | null;
  countryCode: string | null;
  size?: "sm" | "md";
  /**
   * Makes the mark a filter rather than a caption. Only passed where the
   * mark is not already inside a link -- a story card's cover wraps its own
   * anchor, and an anchor inside an anchor is not markup a browser honours.
   */
  href?: string;
}) {
  if (!place) return null;
  const flag = countryCode ? flagFor(countryCode) : null;

  const shape = `inline-flex items-center gap-1.5 rounded-full border border-sea/25 bg-sea/8 font-medium text-sea ${
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
  }`;

  const body = (
    <>
      {flag ? (
        <span aria-hidden className="text-[1.1em] leading-none">
          {flag}
        </span>
      ) : (
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8Z" />
          <circle cx="8" cy="6" r="1.8" />
        </svg>
      )}
      {place}
    </>
  );

  /* Two branches rather than one element with a variable tag: Link and span
     do not share a props type, and the single `href` is not worth a cast. */
  if (href) {
    return (
      <Link
        href={href}
        className={`${shape} transition-colors hover:border-sea/60 hover:bg-sea/15`}
      >
        {body}
      </Link>
    );
  }

  return <span className={shape}>{body}</span>;
}

export { flagFor };
