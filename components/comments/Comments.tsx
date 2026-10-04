import Link from "next/link";
import type { CommentNode } from "@/lib/comments-types";
import { CommentForm } from "./CommentForm";
import { CommentThread } from "./CommentThread";

/**
 * The conversation under a story.
 *
 * Server-rendered: the comments are in the HTML, so they are readable
 * without JavaScript and indexable as part of the page. Only the writing
 * and removing are client-side.
 */
export function Comments({
  storyId,
  path,
  comments,
  total,
  signedIn,
  needsProfile,
}: {
  storyId: string;
  path: string;
  comments: CommentNode[];
  total: number;
  signedIn: boolean;
  /** Signed in but never finished onboarding, so they have no name to post under. */
  needsProfile: boolean;
}) {
  const canWrite = signedIn && !needsProfile;

  return (
    <section id="comments" className="mt-16 border-t-2 border-foreground/10 pt-10">
      <div className="mb-7 flex items-baseline gap-4">
        <h2 className="eyebrow">
          {total === 0 ? "Comments" : total === 1 ? "1 comment" : `${total} comments`}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>

      <div className="max-w-3xl">
        {canWrite ? (
          <CommentForm storyId={storyId} path={path} />
        ) : (
          <p className="rounded-xl border-2 border-dashed border-rule px-5 py-4 text-sm text-muted">
            {needsProfile ? (
              <>
                <Link
                  href="/onboarding"
                  className="font-medium text-accent underline underline-offset-2"
                >
                  Finish setting up your profile
                </Link>{" "}
                to join in.
              </>
            ) : (
              <>
                <Link
                  href={`/signin?next=${encodeURIComponent(path)}`}
                  className="font-medium text-accent underline underline-offset-2"
                >
                  Sign in
                </Link>{" "}
                to leave a comment.
              </>
            )}
          </p>
        )}

        {comments.length > 0 && (
          <ul className="mt-10 space-y-6">
            {comments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                storyId={storyId}
                path={path}
                canReply={canWrite}
                signedIn={signedIn}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
