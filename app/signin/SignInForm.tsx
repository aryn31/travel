"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import {
  sendMagicLink,
  signInWithPassword,
  type SignInState,
} from "./actions";

const initial: SignInState = {};

/**
 * Two ways in, one form. The password path is the default because it is what
 * people expect; the link path stays because there is no email provider
 * configured, so it is also the only account recovery that exists.
 */
export function SignInForm({ next = "" }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");

  return mode === "password" ? (
    <PasswordForm next={next} onUseLink={() => setMode("link")} />
  ) : (
    <LinkForm next={next} onUsePassword={() => setMode("password")} />
  );
}

/** Where to land after signing in. Re-validated server-side. */
function NextField({ next }: { next: string }) {
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

function PasswordForm({ next, onUseLink }: { next: string; onUseLink: () => void }) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <NextField next={next} />
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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>

      {/* Errors that are not about one field -- lockout, or an account that
          has no password yet -- with the way out attached. */}
      {state.error && !state.field && (
        <p role="alert" className="text-sm leading-relaxed text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex flex-col gap-3 border-t border-rule pt-5 text-sm">
        <button
          type="button"
          onClick={onUseLink}
          className={`text-left transition-colors hover:text-foreground ${
            state.useLink ? "font-medium text-accent" : "text-muted"
          }`}
        >
          Forgot it? Email me a sign-in link instead →
        </button>
        <p className="text-muted">
          No account?{" "}
          <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="text-accent underline underline-offset-2">
            Create one
          </Link>
        </p>
      </div>
    </form>
  );
}

function LinkForm({ next, onUsePassword }: { next: string; onUsePassword: () => void }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <NextField next={next} />
      <Field
        label="Email address"
        htmlFor="email"
        error={state.error}
        hint="No password needed. We'll send a link that signs you in."
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

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send me a sign-in link"}
      </Button>

      <div className="border-t border-rule pt-5 text-sm">
        <button
          type="button"
          onClick={onUsePassword}
          className="text-muted transition-colors hover:text-foreground"
        >
          ← Use my password instead
        </button>
      </div>
    </form>
  );
}
