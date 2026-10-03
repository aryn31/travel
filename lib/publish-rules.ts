/**
 * What a draft has to be before it can go out.
 *
 * The site calls itself long-form writing about where you went, and a
 * published story is a permanent URL with the writer's name on it. The
 * floor exists so a one-line post -- "I went to a mall and bought shoes" --
 * cannot become one by accident, and so the archive, the search index and
 * every list stay worth reading.
 *
 * Deliberately low. This is a floor, not an editorial standard: the real
 * stories on the site run 100 to 330 words, so 80 blocks a stray sentence
 * without ever arguing with someone writing a short, finished piece.
 *
 * No `"use server"` and no database import, so the editor can check the
 * same rule it will be judged by -- the same split as password-rules and
 * tags-rules.
 */
export const MIN_WORDS = 80;

/**
 * One word is enough. A story can legitimately be called "Kotor", or
 * "Oi" -- a character count would reject real titles to catch a problem
 * the empty check already catches.
 */
export const MIN_TITLE_WORDS = 1;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type PublishBlock = { reason: string; shortfall?: number };

/**
 * Null when the draft is publishable, otherwise why not.
 *
 * Returns the first problem rather than all of them: a writer fixes one
 * thing at a time, and a list of three complaints about an empty draft is
 * just noise.
 *
 * Takes the count, not the text. The editor already keeps a running word
 * count for the toolbar, and re-walking the document on every render to
 * re-derive a number it is holding would be work for nothing.
 */
export function publishBlockFor(
  title: string,
  words: number,
): PublishBlock | null {
  if (countWords(title) < MIN_TITLE_WORDS) {
    return { reason: "Give the story a title before publishing." };
  }

  if (words === 0) return { reason: "The story is empty." };

  if (words < MIN_WORDS) {
    const shortfall = MIN_WORDS - words;
    return {
      reason: `A story needs ${MIN_WORDS} words to publish — ${shortfall} more to go.`,
      shortfall,
    };
  }

  return null;
}

/** The same rule, for the server, which has the text rather than a count. */
export function publishBlock(title: string, text: string): PublishBlock | null {
  return publishBlockFor(title, countWords(text));
}
