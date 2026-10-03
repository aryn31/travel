"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVisibility } from "../actions";
import {
  VISIBILITIES,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  type Visibility,
} from "@/lib/visibility";

/**
 * Where the story stands, as one control.
 *
 * A native select rather than a menu: four states and twelve transitions
 * between them is exactly what a select is for, it is keyboard-accessible
 * and screen-reader-correct without a line of code, and it matches the
 * country picker a few inches below it.
 *
 * It replaced a Publish button and an Unpublish button, which between them
 * could only express two of the four states and gave no hint that the
 * other two existed.
 */
export function VisibilityPicker({
  storyId,
  status,
  blockedReason,
  onError,
}: {
  storyId: string;
  status: Visibility;
  /** Why the public states are unavailable, if they are. */
  blockedReason?: string;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Visibility>(status);

  function change(next: Visibility) {
    const previous = value;
    setValue(next);
    onError(null);

    startTransition(async () => {
      const result = await setVisibility(storyId, next);
      if (result.ok) {
        // The page reloads its own status, the lock and the banner from
        // the server; nothing here tries to predict them.
        router.refresh();
      } else {
        setValue(previous);
        onError(result.error);
      }
    });
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-muted">Visibility</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value as Visibility)}
        /* The hint for whichever state is selected, so the consequence is
           readable without opening the list. */
        title={VISIBILITY_HINT[value]}
        className="rounded-full border border-rule bg-background px-3 py-1.5 font-medium outline-none transition-colors hover:bg-surface-hover focus:border-accent disabled:opacity-50"
      >
        {VISIBILITIES.map((v) => (
          <option
            key={v}
            value={v}
            /* Disabled rather than hidden: "Public" greyed out with the
               reason beside the control says there is a way in; a missing
               option says the feature does not exist. */
            disabled={Boolean(blockedReason) && v !== "draft" && v !== "private"}
          >
            {VISIBILITY_LABEL[v]}
          </option>
        ))}
      </select>
    </label>
  );
}
