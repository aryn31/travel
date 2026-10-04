"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTripRemovalAction } from "../actions";

/** Take down, or put back. The trip twin of StoryActions. */
export function TripActions({
  collectionId,
  removed,
}: {
  collectionId: string;
  removed: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleTripRemovalAction(
              collectionId,
              !removed,
            );
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
        className={`rounded-full border-2 px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
          removed
            ? "border-rule text-muted hover:border-accent/50 hover:text-accent"
            : "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
        }`}
      >
        {pending ? "…" : removed ? "Put back" : "Take down"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-accent">
          {error}
        </span>
      )}
    </span>
  );
}
