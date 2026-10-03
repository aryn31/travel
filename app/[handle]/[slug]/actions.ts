"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { toggleLike, type LikeState } from "@/lib/likes";
import { addComment, cleanBody, deleteComment, MAX_BODY } from "@/lib/comments";
import * as throttle from "@/lib/throttle";

/**
 * The reading page's two writes.
 *
 * Both re-check the viewer here rather than trusting anything the client
 * sent: a Server Action is a public endpoint with a hard-to-guess name, not
 * a private function.
 */

export type LikeResult =
  | ({ ok: true } & LikeState)
  | { ok: false; error: string };

export async function toggleLikeAction(storyId: string): Promise<LikeResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to like a story." };

  const state = await toggleLike(storyId, viewer.userId);

  /*
   * Deliberately no revalidatePath. The button owns the number and has
   * already drawn it; re-rendering the server component would refetch the
   * whole story to change one integer the client is holding correctly.
   */
  return { ok: true, ...state };
}

export type CommentResult = { ok: true } | { ok: false; error: string };

export async function addCommentAction(
  storyId: string,
  path: string,
  formData: FormData,
): Promise<CommentResult> {
  const viewer = await getViewer();
  if (!viewer?.profile) {
    return { ok: false, error: "Sign in to leave a comment." };
  }

  const body = cleanBody(String(formData.get("body") ?? ""));
  if (!body) return { ok: false, error: "Write something first." };
  if (String(formData.get("body") ?? "").trim().length > MAX_BODY) {
    return { ok: false, error: `Comments are capped at ${MAX_BODY} characters.` };
  }

  // A signed-in account is still an account someone can script.
  const gate = throttle.check(`comment:${viewer.userId}`);
  if (!gate.allowed) {
    const minutes = Math.ceil(gate.retryAfterSeconds / 60);
    return {
      ok: false,
      error: `That's a lot of comments. Try again in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }.`,
    };
  }

  const parentRaw = String(formData.get("parentId") ?? "").trim();
  const id = await addComment({
    storyId,
    authorId: viewer.userId,
    body,
    parentId: parentRaw || null,
  });

  if (!id) return { ok: false, error: "That story isn't accepting comments." };

  throttle.fail(`comment:${viewer.userId}`);
  // Unlike a like, a comment changes a server-rendered list.
  revalidatePath(path);
  return { ok: true };
}

export async function deleteCommentAction(
  commentId: string,
  path: string,
): Promise<CommentResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in first." };

  const done = await deleteComment(commentId, viewer.userId);
  if (!done) return { ok: false, error: "That comment can't be removed." };

  revalidatePath(path);
  return { ok: true };
}
