/**
 * The shape the comment list travels in.
 *
 * Separate from lib/comments.ts for the same reason as comments-rules: that
 * module imports the database client, and a client component only needs the
 * type, which erases at build time.
 */
export type CommentAuthor = {
  handle: string;
  displayName: string;
  avatarKey: string | null;
  /**
   * Shown beside the name. Someone reading a reply from a moderator
   * should be able to tell it is one -- both so it carries the weight it
   * has, and so nobody can impersonate the authority by choosing a
   * display name like "Wendfolk Admin".
   */
  role: "user" | "editor" | "admin";
};

export type CommentNode = {
  id: string;
  body: string;
  createdAt: Date;
  /** Null for a comment that was removed -- the row stays, the text goes. */
  author: CommentAuthor | null;
  deleted: boolean;
  /** Whether this viewer may remove it. */
  canDelete: boolean;
  /** Whether this viewer wrote it -- you do not report yourself. */
  mine: boolean;
  /** Whether this viewer has already reported it. */
  reported: boolean;
  replies: CommentNode[];
};
