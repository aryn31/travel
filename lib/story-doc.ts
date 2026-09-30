/**
 * TipTap document helpers. body_json is the source of truth; body_text is the
 * flattened copy that search and excerpts read (PLAN.md 4.2).
 */
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
