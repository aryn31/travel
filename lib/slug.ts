export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: "Málaga" -> "malaga"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

  return base || "untitled";
}

/**
 * Slugs are unique per author, so collisions only need resolving against that
 * one author's other stories. `taken` should exclude the story being renamed,
 * otherwise a story collides with itself and creeps to -2 on every save.
 */
export function uniqueSlug(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) return desired;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${desired}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${desired}-${Date.now()}`;
}
