/**
 * Who can open a story, and where it shows up.
 *
 * Two independent questions, which is why four states and not a boolean:
 *
 *                 others can open it?   appears in lists?
 *   draft                no                    no
 *   private              no                    no
 *   unlisted             yes                   no
 *   published            yes                   yes
 *
 * draft and private differ only in history: a draft has never been out,
 * a private story has been and has been taken back. That matters because
 * `published_at`, its comments and its likes all survive the round trip.
 *
 * No `"use server"` and no database import, so the editor can reason about
 * the same rules the server enforces -- the same split as publish-rules.
 */
export const VISIBILITIES = ["draft", "published", "unlisted", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  draft: "Draft",
  published: "Public",
  unlisted: "Unlisted",
  private: "Private",
};

export const VISIBILITY_HINT: Record<Visibility, string> = {
  draft: "Only you. Still being written.",
  published: "Anyone. Listed in the archive, on your profile and in search.",
  unlisted: "Anyone with the link. Listed nowhere, and not indexed.",
  private: "Only you. Keeps its date, its likes and its comments.",
};

/** Can someone who is not the author open the URL at all? */
export function isReadable(status: Visibility): boolean {
  return status === "published" || status === "unlisted";
}

/**
 * Does it appear in the archive, the home page, profiles and search?
 *
 * Every one of those queries already filters on `= 'published'`, so this
 * exists to be read rather than called -- it is the statement of the rule
 * those queries happen to implement.
 */
export function isListed(status: Visibility): boolean {
  return status === "published";
}

/**
 * Frozen against editing.
 *
 * Only the states other people can reach. A private story has no readers
 * and no one replying to it, so there is nothing for an edit to pull out
 * from under anyone -- and "make it private, then fix it" is a kinder
 * route back than "unpublish it".
 */
export function isFrozen(status: Visibility): boolean {
  return isReadable(status);
}

/**
 * Does reaching this state put the story in front of anyone?
 *
 * The length floor applies to these and not to the rest: a draft or a
 * private story is nobody's business but the author's, and refusing to
 * let someone file their own notes away would be an odd thing to do.
 */
export function needsPublishCheck(status: Visibility): boolean {
  return isReadable(status);
}
