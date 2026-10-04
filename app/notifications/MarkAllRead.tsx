"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllReadAction } from "./actions";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllReadAction();
          router.refresh();
        })
      }
      className="rounded-full border-2 border-rule px-4 py-2 text-sm transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
