"use client";

import { useRef, useState, useTransition } from "react";
import { addCommentAction } from "@/app/[handle]/[slug]/actions";
import { MAX_BODY } from "@/lib/comments-rules";

/**
 * Writing a comment, or a reply to one.
 *
 * A plain textarea and a server action -- no editor, no formatting. A
 * comment box that can do headings invites people to write a second story
 * underneath the first one.
 */
export function CommentForm({
  storyId,
  path,
  parentId,
  autoFocus,
  onDone,
}: {
  storyId: string;
  /** Which page to revalidate; the action is shared by every story. */
  path: string;
  parentId?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  const over = value.length > MAX_BODY;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(storyId, path, formData);
      if (result.ok) {
        setValue("");
        ref.current?.reset();
        onDone?.();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={ref} action={submit} className="min-w-0">
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <label htmlFor={`body-${parentId ?? "root"}`} className="sr-only">
        {parentId ? "Write a reply" : "Write a comment"}
      </label>
      <textarea
        id={`body-${parentId ?? "root"}`}
        name="body"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        rows={parentId ? 2 : 3}
        placeholder={
          parentId ? "Write a reply…" : "Been there? Say something about it."
        }
        className="w-full resize-y rounded-xl border-2 border-rule bg-background px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-accent"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-faint" role={error ? "alert" : undefined}>
          {error ? (
            <span className="text-accent">{error}</span>
          ) : (
            /* Only once it is nearly a problem. A counter sitting at
               0/2000 under an empty box is a word limit presented as a
               target. */
            value.length > MAX_BODY * 0.8 && (
              <span className={over ? "text-accent" : undefined}>
                {value.length} / {MAX_BODY}
              </span>
            )
          )}
        </p>

        <div className="flex items-center gap-2">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending || !value.trim() || over}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Posting…" : parentId ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
