"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { MIN_PASSWORD, PASSWORD_RULES } from "@/lib/password-rules";
import { changePassword, type PasswordState } from "./actions";

const initial: PasswordState = {};

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, initial);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== next;

  return (
    <form action={action} className="flex max-w-md flex-col gap-5">
      {state.saved && (
        <p
          role="status"
          className="rounded-xl border-2 border-moss/40 bg-moss/10 px-4 py-3 text-sm"
        >
          <strong className="font-medium">Password saved.</strong> Any other
          browser you were signed in on has been signed out.
        </p>
      )}

      {!hasPassword && (
        <p className="rounded-xl border-2 border-dashed border-sun/50 bg-sun/10 px-4 py-3 text-sm leading-relaxed">
          You sign in by link at the moment. Setting a password gives you a
          second way in — the link keeps working either way.
        </p>
      )}

      {hasPassword && (
        <Field
          label="Current password"
          htmlFor="current"
          error={state.field === "current" ? state.error : null}
        >
                    <PasswordInput
            id="current"
            name="current"
            autoComplete="current-password"
          />
        </Field>
      )}

      <Field
        label={hasPassword ? "New password" : "Password"}
        htmlFor="next"
        error={state.field === "next" ? state.error : null}
        hint={tooShort ? `${next.length}/${MIN_PASSWORD} characters` : PASSWORD_RULES}
      >
                <PasswordInput
          id="next"
          name="next"
          autoComplete="new-password"
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

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}
