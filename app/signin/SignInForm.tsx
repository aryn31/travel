"use client";

import { useActionState } from "react";
import { sendMagicLink, type SignInState } from "./actions";

const initial: SignInState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        defaultValue={state.values?.email ?? ""}
        placeholder="you@example.com"
        aria-describedby={state.error ? "email-error" : undefined}
        className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2.5 outline-none focus:border-black/50 dark:focus:border-white/50"
      />
      {state.error && (
        <p id="email-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-3 py-2.5 font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send me a sign-in link"}
      </button>
      <p className="text-xs opacity-60">
        No password. We&apos;ll send a link that signs you in.
      </p>
    </form>
  );
}
