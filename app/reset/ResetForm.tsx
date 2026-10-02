"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { MIN_PASSWORD, PASSWORD_RULES } from "@/lib/password-rules";
import { resetPassword, type ResetState } from "./actions";

const initial: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initial);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== next;

  return (
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
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
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
        {pending ? "Saving…" : "Set new password"}
      </Button>

      <p className="text-xs leading-relaxed text-muted">
        Setting a new password signs out every other browser you were signed
        in on.
      </p>
    </form>
  );
}
