import { slugify } from "./slug";

/**
 * Tag parsing, shared by the editor's field and the save action.
 *
 * Split from lib/tags.ts for the usual reason: that module imports the
 * database client, and the field is a client component.
 */

/** Per story. Six is a description; twenty is a keyword-stuffed listing. */
export const MAX_PER_STORY = 6;
export const MAX_LABEL = 30;

export type StoryTag = { slug: string; label: string };

/**
 * Turns what the writer typed into a clean, deduplicated list.
 *
 * The slug is the identity, so "By Train", "by train" and "by-train" are
 * one tag; the first spelling seen wins the label. Anything that slugifies
 * to nothing -- punctuation, an emoji on its own -- is dropped rather than
 * stored as "untitled".
 */
export function parseTags(raw: string): StoryTag[] {
  const out: StoryTag[] = [];
  const seen = new Set<string>();

  for (const piece of raw.split(",")) {
    const label = piece.trim().replace(/\s+/g, " ").slice(0, MAX_LABEL);
    if (!label) continue;

    const slug = slugify(label);
    // slugify answers "untitled" rather than "" so a story always has a URL.
    // A tag has no such obligation.
    if (slug === "untitled" || seen.has(slug)) continue;

    seen.add(slug);
    out.push({ slug, label });
    if (out.length === MAX_PER_STORY) break;
  }

  return out;
}

/** The text that goes back into the editor's field. */
export function tagsToInput(list: StoryTag[]): string {
  return list.map((t) => t.label).join(", ");
}
