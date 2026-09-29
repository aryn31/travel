"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { HANDLE_RULES } from "@/lib/handles";
import { createProfile, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

export function OnboardingForm({ suggestedHandle }: { suggestedHandle: string }) {
  const [state, action, pending] = useActionState(createProfile, initial);
  const [handle, setHandle] = useState(state.values?.handle ?? suggestedHandle);

  const preview = handle.trim().toLowerCase().replace(/^@/, "");

  return (
    <form action={action} className="flex flex-col gap-7">
      <Field
        label="Your handle"
        htmlFor="handle"
        error={state.field === "handle" ? state.error : null}
        hint={HANDLE_RULES}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg text-faint">
            @
          </span>
          <input
            id="handle"
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoFocus
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            className={inputClass}
          />
        </div>
      </Field>

      {/* Showing the URL as they type makes the handle feel like an address
          rather than a username, which is what it actually is. */}
      <p className="-mt-4 truncate rounded-lg bg-surface px-3.5 py-2.5 font-mono text-xs text-muted">
        yoursite.com/<span className="text-foreground">@{preview || "handle"}</span>
        /your-story
      </p>

      <Field
        label="Display name"
        htmlFor="displayName"
        error={state.field === "displayName" ? state.error : null}
        hint="Shown on your byline. Change it any time."
      >
        <input
          id="displayName"
          name="displayName"
          defaultValue={state.values?.displayName ?? ""}
          autoComplete="name"
          className={inputClass}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create my profile"}
      </Button>
    </form>
  );
}
