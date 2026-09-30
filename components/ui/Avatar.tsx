/**
 * Initials stand in until avatar uploads exist. The colour is derived from the
 * handle rather than random, so a given person looks the same everywhere.
 */
const TINTS = [
  "bg-[#3f6f63] text-white",
  "bg-[#8a5a3c] text-white",
  "bg-[#4a5f86] text-white",
  "bg-[#7a4a6a] text-white",
  "bg-[#5c6b3f] text-white",
  "bg-[#96552f] text-white",
];

/*
 * FNV-1a with an avalanche step on the end. The plain `hash * 31 + c` this
 * replaced put four of the five seeded handles on the same tint: 31 is
 * congruent to 1 mod 6, so the bucket collapsed to a sum of character codes.
 * Raw FNV is no better here -- its low bits are only a parity of the input,
 * and mod 6 samples exactly those -- so the result is mixed before use.
 */
function tintFor(seed: string) {
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
  return TINTS[(hash >>> 0) % TINTS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-20 text-xl",
};

export function Avatar({
  name,
  handle,
  size = "md",
}: {
  name: string;
  handle: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium tracking-wide ${SIZES[size]} ${tintFor(handle)}`}
    >
      {initials(name)}
    </span>
  );
}
