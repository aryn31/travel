"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signInWithPassword, type SignInState } from "./actions";

const initial: SignInState = {};

/**
 * Email and password, and nothing else.
 *
 * The magic link that used to live here is gone: it existed because there
 * was no password to forget and no mail to send one with, and both of those
 * are now untrue. Account recovery is /forgot, which sends a real email.
 */
export function SignInForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Where to land afterwards. Re-validated server-side. */}
      {next && <input type="hidden" name="next" value={next} />}

      <Field
        label="Email address"
        htmlFor="email"
        error={state.field === "email" ? state.error : null}
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          defaultValue={state.values?.email ?? ""}
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state.field === "password" ? state.error : null}
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </Field>

      {/* Errors that belong to no single field -- a lockout, or an account
          with no password yet. */}
      {state.error && !state.field && (
        <p role="alert" className="text-sm leading-relaxed text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex flex-col gap-3 border-t border-rule pt-5 text-sm">
        <Link
          href="/forgot"
          className="text-muted transition-colors hover:text-foreground"
        >
          Forgot your password? →
        </Link>
        <p className="text-muted">
          No account?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="text-accent underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </div>
    </form>
  );
}
