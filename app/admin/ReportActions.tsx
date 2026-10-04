"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReportAction } from "./actions";

/**
 * The two things a moderator can do with a report.
 *
 * Both are one click with no confirmation step: upholding is reversible
 * (a removed story can be restored, and the comment keeps its text), and
 * a queue that asks "are you sure" fifty times is a queue nobody works
 * through.
 */
export function ReportActions({
  reportId,
  targetKind,
}: {
  reportId: string;
  targetKind: "story" | "comment" | "collection" | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(uphold: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await resolveReportAction(reportId, uphold);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => act(true)}
        disabled={pending || targetKind === null}
        title={
          targetKind === null
            ? "The thing this was about is already gone."
            : undefined
        }
        className="rounded-full border-2 border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
      >
        Remove it
      </button>
      <button
        type="button"
        onClick={() => act(false)}
        disabled={pending}
        className="rounded-full border-2 border-rule px-3 py-1.5 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-40"
      >
        Dismiss
      </button>
      {error && (
        <span role="alert" className="text-xs text-accent">
          {error}
        </span>
      )}
    </div>
  );
}
