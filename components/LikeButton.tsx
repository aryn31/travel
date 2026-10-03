"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleLikeAction } from "@/app/[handle]/[slug]/actions";

/**
 * The like, as a control that answers immediately.
 *
 * Optimistic: the count and the fill change on the click, before the server
 * has been asked. A like is worth almost nothing individually, so making
 * someone wait 200ms to see their own tap register costs more than the
 * occasional rollback does.
 */
export function LikeButton({
  storyId,
  initialLiked,
  initialCount,
  signedIn,
  size = "md",
}: {
  storyId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function click() {
    // Signing in is the point of the click for a stranger; the reading page
    // is where they came back to, so that is where they return.
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    startTransition(async () => {
      const result = await toggleLikeAction(storyId);
      if (result.ok) {
        // The server's number wins: someone else may have liked it in the
        // same second, and the optimistic guess only knew about this tab.
        setLiked(result.liked);
        setCount(result.count);
      } else {
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this story" : "Like this story"}
      // Never disabled while in flight: a disabled button mid-click reads as
      // a failure, and the action is idempotent per person anyway.
      data-pending={pending || undefined}
      className={`inline-flex items-center gap-2 rounded-full border-2 font-medium transition-all ${
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2"
      } ${
        liked
          ? "border-accent bg-accent-soft text-accent"
          : "border-rule text-muted hover:border-accent/50 hover:text-accent"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={size === "sm" ? "size-4" : "size-5"}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M12 20.5 4.2 12.9a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l1 1 1-1a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z" />
      </svg>
      <span className="tabular-nums">{count}</span>
      <span className="sr-only">{count === 1 ? "like" : "likes"}</span>
    </button>
  );
}
