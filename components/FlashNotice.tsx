"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * A one-off confirmation after something that leaves no other trace.
 *
 * Signing out is the case that prompted it: the page simply changed and the
 * nav quietly swapped two links, which is indistinguishable from a misclick
 * that did nothing. Saying so out loud is the difference between "did that
 * work?" and knowing it did.
 *
 * Driven by a query parameter rather than state, because the thing that
 * triggers it is a server-side redirect and there is nothing left of the
 * request by the time anything renders.
 */
type Message = { title: string; detail?: string };

const MESSAGES: Record<string, Message> = {
  signedout: {
    title: "You're signed out.",
    detail: "Your drafts are safe — sign in again whenever you like.",
  },
};

const DISMISS_AFTER_MS = 7000;

export function FlashNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const flashKey = params.get("flash") ?? "";
  const message = MESSAGES[flashKey];

  /*
   * Removing the parameter *is* the dismissal -- there is no `visible`
   * state at all.
   *
   * The obvious version, storing the message and clearing state on a timer,
   * fails in a way worth recording: stripping the parameter re-renders this
   * with a different key, React remounts it, and the fresh instance finds
   * no parameter and renders nothing. The notice disappeared instantly.
   * Deriving straight from the URL cannot drift from it.
   */
  const dismiss = useCallback(
    () => router.replace(pathname, { scroll: false }),
    [router, pathname],
  );

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(dismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      /* Fixed and above the header: this has to be visible wherever the
         redirect happened to land, including halfway down a story. */
      className="fixed inset-x-0 top-20 z-[70] flex justify-center px-4"
    >
      <div className="flash-in flex max-w-md items-start gap-3 rounded-2xl border-2 border-moss/40 bg-surface px-5 py-4 shadow-[var(--shadow)]">
        <span
          aria-hidden
          className="mt-0.5 inline-grid size-6 shrink-0 place-items-center rounded-full bg-moss/20 text-moss"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>

        <p className="text-sm leading-relaxed">
          <strong className="font-medium">{message.title}</strong>
          {message.detail && (
            <span className="block text-muted">{message.detail}</span>
          )}
        </p>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1.5 -mt-1 ml-1 shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
