"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { sendMagicLink, type SignInState } from "./actions";

const initial: SignInState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="Email address"
        htmlFor="email"
        error={state.error}
        hint="No password. We'll send a link that signs you in."
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          defaultValue={state.values?.email ?? ""}
          placeholder="you@example.com"
          aria-describedby={state.error ? "email-error" : undefined}
          className={inputClass}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send me a sign-in link"}
      </Button>
    </form>
  );
}
