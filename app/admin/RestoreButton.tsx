"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreStoryAction } from "./actions";

/** Undoing a removal. The half of moderation that makes the other half safe. */
export function RestoreButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreStoryAction(storyId);
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
        className="ml-2 text-xs text-accent underline underline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {pending ? "Restoring…" : "Put it back"}
      </button>
      {error && (
        <span role="alert" className="ml-2 text-xs text-accent">
          {error}
        </span>
      )}
    </>
  );
}
