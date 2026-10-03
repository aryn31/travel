import Link from "next/link";

/**
 * A tag, as a link to everything else wearing it.
 *
 * Visually distinct from PlaceMark on purpose: a place is a pin and a tag
 * is a label, and a reader scanning a story's header should be able to tell
 * "Naples" from "food" without reading either.
 */
export function TagChip({
  slug,
  label,
  size = "md",
}: {
  slug: string;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <Link
      href={`/stories?tag=${encodeURIComponent(slug)}`}
      className={`inline-flex items-center gap-1 rounded-md border border-plum/30 bg-plum/8 font-medium text-plum transition-colors hover:border-plum/60 hover:bg-plum/15 ${
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"
      }`}
    >
      <span aria-hidden className="opacity-60">#</span>
      {label}
    </Link>
  );
}
