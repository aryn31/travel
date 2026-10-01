"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { MIN_PASSWORD, PASSWORD_RULES } from "@/lib/password-rules";
import { createAccount, type SignUpState } from "./actions";

const initial: SignUpState = {};

export function SignUpForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(createAccount, initial);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Client-side only as a courtesy; the action checks both again.
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="flex flex-col gap-5">
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
        hint={tooShort ? `${password.length}/${MIN_PASSWORD} characters` : PASSWORD_RULES}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Password again"
        htmlFor="confirm"
        error={
          state.field === "confirm"
            ? state.error
            : mismatch
              ? "The two passwords do not match."
              : null
        }
      >
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
