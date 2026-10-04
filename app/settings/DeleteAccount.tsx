"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmAccountDeletion,
  requestAccountDeletion,
  type DeleteState,
} from "./actions";
import { CODE_LENGTH } from "@/lib/otp-rules";

export type Summary = {
  stories: number;
  trips: number;
  comments: number;
  photos: number;
  likesGiven: number;
  likesReceived: number;
};

/**
 * Closing the account for good.
 *
 * Three deliberate pieces of friction, in order: it is folded away until
 * asked for, it says exactly what will be destroyed with real numbers
 * rather than "all your data", and it needs a code from the email
 * address. None of them are there to talk anyone out of it -- they are
 * there so nobody does it by accident, because there is no undo.
 */
export function DeleteAccount({
  email,
  summary,
  blocked,
}: {
  email: string;
  summary: Summary;
  /** Why this account cannot close itself -- see deletionBlock. */
  blocked: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, startSending] = useTransition();
  const [state, confirm, pending] = useActionState<DeleteState, FormData>(
    confirmAccountDeletion,
    { stage: "idle" },
  );
  const [sent, setSent] = useState<DeleteState | null>(null);

  const stage = state.stage !== "idle" ? state.stage : (sent?.stage ?? "idle");
  const error = state.error ?? sent?.error;

  if (stage === "gone") {
    return (
      <div className="max-w-xl rounded-xl border-2 border-rule p-6">
        <h3 className="font-display text-xl font-semibold">Account deleted</h3>
        <p className="mt-2 text-muted">
          It is gone — the stories, the trips, the photographs, all of it.
          Thank you for the writing while it lasted.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Back to Wendfolk
        </button>
      </div>
    );
  }

  /*
   * Said before the button rather than after it. Offering an action that
   * will be refused, and only explaining why once somebody has committed
   * to it, is a worse version of not offering it at all.
   */
  if (blocked) {
    return (
      <div className="max-w-xl rounded-xl border-2 border-dashed border-rule p-6">
        <h3 className="font-display text-xl font-semibold">
          This account is closed on the server
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm text-muted">{blocked}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-red-600 dark:hover:text-red-400"
      >
        Delete my account
      </button>
    );
  }

  const nothing =
    summary.stories === 0 &&
    summary.trips === 0 &&
    summary.comments === 0 &&
    summary.photos === 0;

  return (
    <div className="max-w-xl rounded-xl border-2 border-red-500/40 bg-red-500/5 p-6">
      <h3 className="font-display text-xl font-semibold">
        This deletes everything, permanently
      </h3>

      {/* Counted from the real rows. "All your data" is a phrase people
          skim; "3 stories and 24 photographs" is one they read. */}
      <p className="mt-3 text-sm text-muted">
        There is no undo, no grace period and no copy kept. Going now:
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        <Line n={summary.stories} one="story" many="stories" />
        <Line n={summary.trips} one="trip" many="trips" />
        <Line n={summary.photos} one="photograph" many="photographs" />
        <Line
          n={summary.comments}
          one="comment you left"
          many="comments you left"
          note="including replies under other people's stories"
        />
        <Line n={summary.likesGiven} one="like you gave" many="likes you gave" />
        <li className="flex gap-2">
          <span aria-hidden className="text-red-600 dark:text-red-400">—</span>
          <span>
            your profile, your handle{" "}
            <span className="text-muted">
              (somebody else can claim it afterwards)
            </span>
            , your saved list and your notifications
          </span>
        </li>
        {summary.likesReceived > 0 && (
          <li className="flex gap-2">
            <span aria-hidden className="text-red-600 dark:text-red-400">—</span>
            <span className="text-muted">
              the {summary.likesReceived} likes your writing has received go
              with it
            </span>
          </li>
        )}
      </ul>

      {nothing && (
        <p className="mt-3 text-sm text-muted">
          You have not published anything, so there is not much to lose.
        </p>
      )}

      {stage === "idle" ? (
        <>
          <p className="mt-5 text-sm text-muted">
            We will email a {CODE_LENGTH}-digit code to{" "}
            <strong className="font-medium text-foreground">{email}</strong> to
            be sure it is you.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={sending}
              onClick={() =>
                startSending(async () => setSent(await requestAccountDeletion()))
              }
              className="rounded-full border-2 border-red-500/50 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
            >
              {sending ? "Sending…" : "Email me a code"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              Keep my account
            </button>
          </div>
        </>
      ) : (
        <form action={confirm} className="mt-5">
          <label htmlFor="delete-code" className="block text-sm text-muted">
            Enter the code we sent to {email}
          </label>
          <input
            id="delete-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH + 2}
            required
            placeholder="000000"
            className="font-display mt-2 w-40 rounded-xl border-2 border-rule bg-background px-4 py-3 text-2xl tracking-[0.3em] outline-none transition-colors focus:border-accent"
          />

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Delete everything"}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() =>
                startSending(async () => setSent(await requestAccountDeletion()))
              }
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              Send another code
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              Keep my account
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** One line of the list, left out entirely when the count is zero. */
function Line({
  n,
  one,
  many,
  note,
}: {
  n: number;
  one: string;
  many: string;
  note?: string;
}) {
  if (n === 0) return null;
  return (
    <li className="flex gap-2">
      <span aria-hidden className="text-red-600 dark:text-red-400">—</span>
      <span>
        <strong className="font-medium">{n}</strong> {n === 1 ? one : many}
        {note && <span className="text-muted"> ({note})</span>}
      </span>
    </li>
  );
}
