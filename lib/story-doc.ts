/**
 * TipTap document helpers. body_json is the source of truth; body_text is the
 * flattened copy that search and excerpts read (PLAN.md 4.2).
 */
import { keyFromSrc, publicUrl } from "./media-url";
export type Mark = { type: string; attrs?: Record<string, unknown> };
export type Node = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: Node[];
};
export type StoryDoc = { type: "doc"; content: Node[] };

export const EMPTY_DOC: StoryDoc = { type: "doc", content: [] };

/** Blocks whose text should end up on its own line in body_text. */
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "codeBlock",
]);

export function isDoc(value: unknown): value is StoryDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as StoryDoc).type === "doc" &&
    Array.isArray((value as StoryDoc).content)
  );
}

/** Plain text for one line of the textarea era; still used for empty drafts. */
export function textToDoc(text: string): StoryDoc {
  if (text.length === 0) return EMPTY_DOC;
  return {
    type: "doc",
    content: text.split("\n").map((line) =>
      line.length > 0
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" },
    ),
  };
}

/**
 * Flatten any TipTap doc to text. Walks the whole tree rather than assuming
 * one level of paragraphs, so headings, lists and quotes are all searchable.
 */
export function docToText(doc: unknown): string {
  if (!isDoc(doc)) return "";

  const lines: string[] = [];

  const walk = (node: Node, into: string[]) => {
    if (node.type === "text") {
      into.push(node.text ?? "");
      return;
    }
    if (node.type === "hardBreak") {
      into.push("\n");
      return;
    }
    if (node.type === "image") {
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (alt) lines.push(alt);
      return;
    }

    if (BLOCK_TYPES.has(node.type)) {
      const parts: string[] = [];
      for (const child of node.content ?? []) walk(child, parts);
      const line = parts.join("").trim();
      if (line) lines.push(line);
      return;
    }

    for (const child of node.content ?? []) walk(child, into);
  };

  for (const node of doc.content) walk(node, []);
  return lines.join("\n");
}

/**
 * Prose only -- headings are skipped. docToText joins every block with a
 * newline, and excerpt() collapses whitespace, so a heading ran straight into
 * the next sentence: "...into water. The bay Everything in Kotor is...".
 */
export function docToSummary(doc: unknown): string {
  if (!isDoc(doc)) return "";

  const lines: string[] = [];
  const walk = (node: Node) => {
    if (node.type === "heading") return;

    if (node.type === "paragraph" || node.type === "blockquote" || node.type === "listItem") {
      const text = collectText(node).trim();
      if (text) lines.push(text);
      return;
    }
    for (const child of node.content ?? []) walk(child);
  };
  for (const node of doc.content) walk(node);
  return lines.join(" ");
}

function collectText(node: Node): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "image") return "";
  return (node.content ?? []).map(collectText).join("");
}

export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 200));
}

export function excerpt(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/**
 * The first pull quote in a story, if it has one. Used to break the rhythm of
 * the home page with a line in the author's own voice rather than another
 * card that looks like the last card.
 */
export function firstQuote(doc: unknown): string | null {
  if (!isDoc(doc)) return null;

  let found: string | null = null;
  const walk = (node: Node) => {
    if (found) return;
    if (node.type === "blockquote") {
      const text = collectText(node).trim();
      if (text.length >= 40 && text.length <= 240) found = text;
      return;
    }
    for (const child of node.content ?? []) walk(child);
  };
  for (const node of doc.content) walk(node);
  return found;
}

/** Image keys referenced by a doc, so orphaned uploads can be spotted later. */
export function imageUrls(doc: unknown): string[] {
  if (!isDoc(doc)) return [];
  const found: string[] = [];
  const walk = (node: Node) => {
    if (node.type === "image" && typeof node.attrs?.src === "string") {
      found.push(node.attrs.src);
    }
    for (const child of node.content ?? []) walk(child);
  };
  for (const node of doc.content) walk(node);
  return found;
}

/**
 * The same document with every image `src` resolved to where the bytes
 * actually are now.
 *
 * A body holds whatever URL was current when the image was inserted, so
 * documents written before the move to Supabase still say `/api/media/…` --
 * a route that now answers 404 for exactly those files. The reading page
 * already resolves src to key to URL on the way out; the editor renders the
 * attribute as stored, so it needs the same treatment on the way in or
 * every pre-move photograph shows as a broken image while editing.
 *
 * Resolving rather than rewriting the stored data: a key is the durable
 * identity and a URL is a rendering of it, so a future change of provider
 * still needs no migration.
 */
export function withResolvedImages(doc: unknown): StoryDoc {
  if (!isDoc(doc)) return EMPTY_DOC;

  const fix = (node: Node): Node => {
    const next: Node =
      node.type === "image" && typeof node.attrs?.src === "string"
        ? (() => {
            const key = keyFromSrc(node.attrs.src as string);
            // Left alone when it is not one of ours -- an external image
            // pasted into a story is still a legitimate src.
            return key
              ? { ...node, attrs: { ...node.attrs, src: publicUrl(key) } }
              : node;
          })()
        : node;

    return next.content
      ? { ...next, content: next.content.map(fix) }
      : next;
  };

  return { ...doc, content: doc.content.map(fix) };
}

/**
 * The opening of a story: the first `blocks` prose blocks, images dropped.
 *
 * Used for the signed-out teaser. Images are left out on purpose -- the
 * photographs are the most expensive thing on the page and the most
 * valuable thing to withhold, and a teaser that loads three 300KB covers
 * costs more to serve than the story it is holding back.
 */
export function openingOf(doc: unknown, blocks = 3): StoryDoc {
  if (!isDoc(doc)) return EMPTY_DOC;

  const taken: Node[] = [];
  for (const node of doc.content) {
    if (taken.length >= blocks) break;
    if (node.type === "image") continue;
    if (collectText(node).trim().length === 0) continue;
    taken.push(node);
  }
  return { type: "doc", content: taken };
}

/** Whether a doc has more to show than its opening -- i.e. a wall is worth it. */
export function hasMoreThanOpening(doc: unknown, blocks = 3): boolean {
  if (!isDoc(doc)) return false;
  return doc.content.filter((n) => n.type !== "image").length > blocks;
}
