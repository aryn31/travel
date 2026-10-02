"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { MIN_PASSWORD, PASSWORD_RULES } from "@/lib/password-rules";
import { CODE_LENGTH } from "@/lib/otp-rules";
import { startSignup, verifySignup, type SignUpState } from "./actions";

const initial: SignUpState = {};

export function SignUpForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(startSignup, initial);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  /* "Start again" has to beat state.awaitingCode, which useActionState has
     no way to clear. A reload would also do it, but throws away the typed
     password and makes the browser fetch the page twice. */
  const [restarted, setRestarted] = useState(false);

  // Client-side only as a courtesy; the action checks both again.
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;

  /*
   * Once a code is out, the details step is replaced rather than hidden.
   * Leaving it on screen invites editing the address the code was sent to,
   * which would verify one mailbox and create the account on another.
   */
  if (state.awaitingCode && !restarted) {
    return (
      <CodeStep
        email={state.values?.email ?? ""}
        next={next}
        onRestart={() => setRestarted(true)}
      />
    );
  }

  return (
    <form
      action={action}
      onSubmit={() => setRestarted(false)}
      className="flex flex-col gap-5"
    >
      <Field
        label="Email address"
        htmlFor="email"
        error={state.field === "email" ? state.error : null}
        hint="We'll send a code here to check it's yours."
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
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
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
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending a code…" : "Send me a code"}
      </Button>

      <p className="text-xs leading-relaxed text-muted">
        Nothing is created until the code checks out.
      </p>
    </form>
  );
}

function CodeStep({
  email,
  next,
  onRestart,
}: {
  email: string;
  next: string;
  onRestart: () => void;
}) {
  const [state, action, pending] = useActionState(verifySignup, initial);
  const [code, setCode] = useState("");

  // The signup expired or ran out of tries: there is nothing left to verify,
  // so the only honest option is to begin again.
  if (state.startOver) {
    return (
      <div>
        <p role="alert" className="rounded-xl border-2 border-accent/40 bg-accent-soft px-4 py-3 text-sm leading-relaxed">
          {state.error}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          Start again
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="email" value={email} />
      {next && <input type="hidden" name="next" value={next} />}

      <p className="rounded-xl border-2 border-dashed border-sun/50 bg-sun/10 px-4 py-3 text-sm leading-relaxed">
        We sent a {CODE_LENGTH}-digit code to{" "}
        <span className="font-medium">{email}</span>. It expires in ten
        minutes.
      </p>

      <Field
        label="Your code"
        htmlFor="code"
        error={state.field === "code" ? state.error : null}
        hint="Check spam if it hasn't arrived."
      >
        <input
          id="code"
          name="code"
          /* inputMode over type=number: a spinner on a six-digit code is
             useless, and type=number drops leading zeros. */
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`}
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        disabled={pending || code.length < CODE_LENGTH}
      >
        {pending ? "Checking…" : "Create my account"}
      </Button>

      <p className="border-t border-rule pt-5 text-sm text-muted">
        Wrong address, or no code?{" "}
        <button
          type="button"
          onClick={onRestart}
          className="text-accent underline underline-offset-2"
        >
          Start again
        </button>
      </p>
    </form>
  );
}
