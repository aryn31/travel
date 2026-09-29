/**
 * Minimal TipTap-compatible document shape. Week 1 writes these from a plain
 * textarea; Week 2 swaps in the real editor and the stored format is already
 * right, so no migration and no reformatting of existing drafts.
 */
export type TextNode = { type: "text"; text: string };
export type Paragraph = { type: "paragraph"; content?: TextNode[] };
export type StoryDoc = { type: "doc"; content: Paragraph[] };

export const EMPTY_DOC: StoryDoc = { type: "doc", content: [] };

/** One line of the textarea becomes one paragraph. textToDoc/docToText round-trip exactly. */
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

export function docToText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const content = (doc as StoryDoc).content;
  if (!Array.isArray(content)) return "";

  return content
    .map((block) => (block.content ?? []).map((n) => n.text ?? "").join(""))
    .join("\n");
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
