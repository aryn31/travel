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
  replies: CommentNode[];
};
