"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReport } from "@/app/report/actions";
import {
  MAX_DETAIL,
  REASON_HINT,
  REASON_LABEL,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/report-rules";
import type { Target } from "@/lib/reports";

/**
 * Reporting something that is not yours.
 *
 * Deliberately quiet: small, grey, and next to the other secondary
 * actions. A prominent report button on every piece of writing changes
 * what a page feels like, and the people who need it will look for it.
 */
export function ReportButton({
  target,
  alreadyReported,
  signedIn,
  className,
}: {
  target: Target;
  alreadyReported: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(alreadyReported);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const base = className ?? "text-xs text-muted transition-colors hover:text-accent";

  if (done) {
    return (
      <span className={`${base} cursor-default hover:text-muted`}>
        Reported
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          // Signing in is the point of the click for a stranger.
          if (!signedIn) {
            router.push(
              `/signin?next=${encodeURIComponent(window.location.pathname)}`,
            );
            return;
          }
          setOpen(true);
        }}
        className={base}
      >
        Report
      </button>
    );
  }

  function send(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitReport(target, formData);
      if (result.ok) {
        setOpen(false);
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      action={send}
      className="mt-3 w-full max-w-md rounded-xl border-2 border-rule bg-surface p-4 text-sm"
    >
      <p className="mb-3 font-medium">What is wrong with this?</p>

      <div className="space-y-1.5">
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-start gap-2">
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="mt-1 accent-accent"
            />
            <span>
              <span className="block">{REASON_LABEL[r]}</span>
              {reason === r && (
                <span className="block text-xs text-faint">
                  {REASON_HINT[r]}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>

      <label htmlFor="report-detail" className="sr-only">
        Anything else
      </label>
      <textarea
        id="report-detail"
        name="detail"
        rows={2}
        maxLength={MAX_DETAIL}
        placeholder="Anything else? (optional)"
        className="mt-3 w-full resize-y rounded-lg border border-rule bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
      />

      {error && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Sending…" : "Send report"}
        </button>
      </div>
    </form>
  );
}
