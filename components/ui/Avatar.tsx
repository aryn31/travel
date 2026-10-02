import { publicUrl } from "@/lib/media-url";

/**
 * A photo when there is one, a signature when there is not.
 *
 * The fallback used to be initials on a flat colour disc, which read as a
 * placeholder because that is what it was. Writing the initials instead --
 * in a hand, at a slight angle, over a swash, in ink on paper -- turns the
 * absence of a photo into something that belongs on a site about people who
 * write.
 */

/* Ink colours, derived from the handle rather than random, so a given person
   signs in the same ink everywhere they appear. */
const INKS = [
  "#3f6f63",
  "#8a5a3c",
  "#4a5f86",
  "#7a4a6a",
  "#5c6b3f",
  "#96552f",
];

/*
 * FNV-1a with an avalanche step on the end. The plain `hash * 31 + c` this
 * replaced put four of the five seeded handles on the same value: 31 is
 * congruent to 1 mod 6, so the bucket collapsed to a sum of character codes.
 * Raw FNV is no better here -- its low bits are only a parity of the input,
 * and mod 6 samples exactly those -- so the result is mixed before use.
 */
function hashOf(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x21f0aaad);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x735a2d97);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

/* Not upper-cased: a signature is written, and "MO" in a hand reads as
   lettering while "MO" with its natural capitals reads as someone's mark. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}

const SIZES = {
  sm: "size-8",
  md: "size-11",
  lg: "size-20",
};

/* The written initials run larger than set type to read at the same size: a
   script face carries far less weight per pixel than a sans. */
const SIGNATURE_TEXT = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-4xl",
};

export function Avatar({
  name,
  handle,
  size = "md",
  avatarKey,
}: {
  name: string;
  handle: string;
  size?: keyof typeof SIZES;
  /** Storage key, resolved to a URL here so callers only ever pass the key. */
  avatarKey?: string | null;
}) {
  const shape = `inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full ${SIZES[size]}`;

  if (avatarKey) {
    // next/image is deliberately avoided here for the same reason as
    // StoryBody: avatars come straight from the bucket rather than through
    // the host's optimizer, and they are already cropped to 512px on upload.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={publicUrl(avatarKey)}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={`${shape} bg-surface object-cover`}
      />
    );
  }

  const h = hashOf(handle);
  const ink = INKS[h % INKS.length];
  /* A signature never lands square on the line. Deterministic per handle, so
     the angle is a property of the person rather than a jitter that changes
     between the server render and the client one. */
  const tilt = ((h >>> 8) % 13) - 6;

  return (
    <span
      aria-hidden
      className={`${shape} relative bg-[#f7f0e2] dark:bg-[#272018]`}
      style={{ color: ink }}
    >
      <span
        className={`font-signature leading-none ${SIGNATURE_TEXT[size]}`}
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        {initials(name)}
      </span>

      {/* The swash beneath. Drawn rather than an underline so it can
          overshoot the letters at both ends and cross its own line, which is
          what makes a signature look signed rather than typed. */}
      <svg
        viewBox="0 0 40 10"
        className="pointer-events-none absolute inset-x-[12%] bottom-[16%] w-[76%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={size === "lg" ? 0.9 : 1.5}
        strokeLinecap="round"
        opacity="0.5"
      >
        <path d="M1.5 6.5C7 2.8 14 2.2 21 4.2s12 1.9 17.5-2.4" />
      </svg>
    </span>
  );
}
