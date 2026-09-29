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

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
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
