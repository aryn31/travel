"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { MIN_PASSWORD, PASSWORD_RULES } from "@/lib/password-rules";
import { resetPassword, type ResetState } from "./actions";

const initial: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initial);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== next;

  /*
   * The form is gone once the password is set. Leaving it on screen invites
   * a second submit with a token that no longer exists, which would answer
   * "that link is not valid" to someone who just succeeded.
   */
  if (state.done) {
    return (
      <div role="status">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          You&apos;re all set
        </h1>
        <p className="mb-8 mt-2 text-muted">That password is yours now.</p>

        <p className="rounded-xl border-2 border-moss/40 bg-moss/10 px-4 py-3 leading-relaxed">
          Sign in with your new password to get back to your stories.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Every device this account was signed in on has been signed out,
          including this one.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <p className="mb-8 mt-2 text-muted">Then sign in with it.</p>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="token" value={token} />

      {state.field === "token" && (
        <p role="alert" className="rounded-xl border-2 border-accent/40 bg-accent-soft px-4 py-3 text-sm leading-relaxed">
          {state.error}{" "}
          <Link href="/forgot" className="font-medium text-accent underline underline-offset-2">
            Send a new link
          </Link>
          .
        </p>
      )}

      <Field
        label="New password"
        htmlFor="next"
        error={state.field === "next" ? state.error : null}
        hint={tooShort ? `${next.length}/${MIN_PASSWORD} characters` : PASSWORD_RULES}
      >
                <PasswordInput
          id="next"
          name="next"
          autoComplete="new-password"
          autoFocus
          value={next}
          onChange={setNext}
        />
      </Field>

      <Field
        label="Repeat it"
        htmlFor="confirm"
        error={
          state.field === "confirm"
            ? state.error
            : mismatch
              ? "The two passwords do not match."
              : null
        }
      >
                <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>

        <p className="text-xs leading-relaxed text-muted">
          Setting a new password signs out every browser this account was
          signed in on.
        </p>
      </form>
    </>
  );
}
