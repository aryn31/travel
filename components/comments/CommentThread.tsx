"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { deleteCommentAction } from "@/app/[handle]/[slug]/actions";
import type { CommentNode } from "@/lib/comments-types";
import { CommentForm } from "./CommentForm";

/**
 * One comment and whatever came back.
 *
 * A client component because replying and removing both open and close
 * things in place; the list itself is rendered on the server and handed
 * down, so the comments are in the HTML whether or not the JavaScript
 * arrives.
 */
export function CommentThread({
  comment,
  storyId,
  path,
  canReply,
  depth = 0,
}: {
  comment: CommentNode;
  storyId: string;
  path: string;
  canReply: boolean;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteCommentAction(comment.id, path);
      // Hidden straight away rather than waiting for the revalidate to come
      // back, which otherwise leaves the comment sitting there for a beat
      // after the click.
      if (result.ok) setRemoved(true);
    });
  }

  const gone = removed || comment.deleted;

  return (
    <li className={depth > 0 ? "" : "border-t border-rule pt-6 first:border-0 first:pt-0"}>
      <article className="min-w-0">
        {gone ? (
          /* The row stays so its replies keep their place -- see the
             deleted_at note in lib/db/schema.ts. */
          <p className="py-1 text-sm italic text-faint">Comment removed.</p>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <Link href={`/@${comment.author!.handle}`} className="shrink-0">
                <Avatar
                  name={comment.author!.displayName}
                  handle={comment.author!.handle}
                  avatarKey={comment.author!.avatarKey}
                  size="sm"
                />
              </Link>
              <Link
                href={`/@${comment.author!.handle}`}
                className="text-sm font-medium transition-colors hover:text-accent"
              >
                {comment.author!.displayName}
              </Link>
              <span aria-hidden className="text-faint">·</span>
              <time
                dateTime={comment.createdAt.toISOString()}
                className="text-xs text-faint"
              >
                {comment.createdAt.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </div>

            {/* whitespace-pre-wrap, not a markdown renderer: the body is
                stored as typed and never interpreted, so there is nothing
                here to inject into. */}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {comment.body}
            </p>

            <div className="mt-2 flex items-center gap-4 text-xs">
              {canReply && depth === 0 && (
                <button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  className="text-muted transition-colors hover:text-accent"
                >
                  {replying ? "Cancel" : "Reply"}
                </button>
              )}
              {comment.canDelete && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="text-muted transition-colors hover:text-accent disabled:opacity-50"
                >
                  {pending ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          </>
        )}

        {replying && (
          <div className="mt-4">
            <CommentForm
              storyId={storyId}
              path={path}
              parentId={comment.id}
              autoFocus
              onDone={() => setReplying(false)}
            />
          </div>
        )}

        {comment.replies.length > 0 && (
          /* The only indent there is. One level deep, marked with a rule
             rather than a margin that doubles every time. */
          <ul className="mt-5 space-y-5 border-l-2 border-rule pl-5">
            {comment.replies.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                storyId={storyId}
                path={path}
                canReply={canReply}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </article>
    </li>
  );
}
