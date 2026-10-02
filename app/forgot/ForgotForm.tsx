"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { requestReset, type ForgotState } from "./actions";

const initial: ForgotState = {};

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, initial);

  if (state.sent) {
    return (
      <div role="status">
        <p className="rounded-xl border-2 border-moss/40 bg-moss/10 px-4 py-3 leading-relaxed">
          <strong className="font-medium">Check your email.</strong> If there is
          an account for{" "}
          <span className="font-medium">{state.values?.email}</span>, a reset
          link is on its way. It works once and expires in an hour.
        </p>
        <p className="mt-5 text-sm text-muted">
          Nothing arrived? Check spam, then{" "}
          <Link href="/forgot" className="text-accent underline underline-offset-2">
            try again
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="Email address"
        htmlFor="email"
        error={state.error}
        hint="We'll send a link to choose a new password."
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
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="border-t border-rule pt-5 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/signin" className="text-accent underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
