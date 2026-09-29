"use client";

import { useActionState } from "react";
import { HANDLE_RULES } from "@/lib/handles";
import { createProfile, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

export function OnboardingForm({
  suggestedHandle,
}: {
  suggestedHandle: string;
}) {
  const [state, action, pending] = useActionState(createProfile, initial);
  const inputClass =
    "w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2.5 outline-none focus:border-black/50 dark:focus:border-white/50";

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="handle" className="text-sm font-medium">
          Your handle
        </label>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg opacity-40">@</span>
          <input
            id="handle"
            name="handle"
            defaultValue={state.values?.handle ?? suggestedHandle}
            autoFocus
            spellCheck={false}
            autoCapitalize="none"
            className={inputClass}
          />
        </div>
        <p className="text-xs opacity-60">
          {HANDLE_RULES}. Your stories will live at{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            /@handle/story-title
          </code>
          .
        </p>
        {state.field === "handle" && state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={state.values?.displayName ?? ""}
          className={inputClass}
        />
        <p className="text-xs opacity-60">Shown on your byline. Change it any time.</p>
        {state.field === "displayName" && state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-3 py-2.5 font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create my profile"}
      </button>
    </form>
  );
}
