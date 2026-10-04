"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleSaveAction } from "@/app/saved/actions";
import type { SaveTarget } from "@/lib/saves";

/**
 * Keeping something for later.
 *
 * A bookmark, not a heart: the two sit next to each other on a story and
 * have to be told apart at a glance, because one is a message to the
 * writer and the other is a note to yourself.
 *
 * Optimistic, for the same reason the like button is -- the whole value of
 * the gesture is that it costs nothing.
 */
export function SaveButton({
  target,
  initialSaved,
  signedIn,
  size = "md",
}: {
  target: SaveTarget;
  initialSaved: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function click() {
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleSaveAction(target);
      // The server's answer wins: another tab may already have saved it.
      if (result.ok) setSaved(result.saved);
      else setSaved(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={saved}
      aria-label={saved ? "Remove from your saved list" : "Save for later"}
      data-pending={pending || undefined}
      className={`inline-flex items-center gap-2 rounded-full border-2 font-medium transition-all ${
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2"
      } ${
        saved
          ? "border-sea bg-sea/10 text-sea"
          : "border-rule text-muted hover:border-sea/50 hover:text-sea"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={size === "sm" ? "size-4" : "size-5"}
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M6 4h12a1 1 0 0 1 1 1v15.2a.5.5 0 0 1-.78.41L12 16.5l-6.22 4.11a.5.5 0 0 1-.78-.41V5a1 1 0 0 1 1-1Z" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
