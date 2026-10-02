"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { sendMessage, type ContactState } from "./actions";

const initial: ContactState = {};
const MAX = 4000;

export function ContactForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(sendMessage, initial);
  const [message, setMessage] = useState("");

  if (state.sent) {
    return (
      <div role="status">
        <p className="rounded-xl border-2 border-moss/40 bg-moss/10 px-4 py-3 leading-relaxed">
          <strong className="font-medium">Sent.</strong> We&apos;ll reply to{" "}
          <span className="font-medium">{state.values?.email}</span> — usually
          within a day or two.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Honeypot: off-screen, unlabelled, and ignored by anyone who can see
          the page. Left in the tab order's path but hidden from assistive
          tech, so no real person is asked to fill it. */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field
        label="Your name"
        htmlFor="name"
        error={state.field === "name" ? state.error : null}
      >
        <input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={state.values?.name ?? defaultName}
          className={inputClass}
        />
      </Field>

      <Field
        label="Your email"
        htmlFor="email"
        error={state.field === "email" ? state.error : null}
        hint="So we can reply."
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? defaultEmail}
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>

      <Field
        label="Message"
        htmlFor="message"
        error={state.field === "message" ? state.error : null}
        hint={`${message.length.toLocaleString()}/${MAX.toLocaleString()}`}
      >
        <textarea
          id="message"
          name="message"
          rows={7}
          maxLength={MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          className={`${inputClass} resize-y`}
        />
      </Field>

      {/* Errors that belong to no single field -- a send cap, mostly. */}
      {state.error && !state.field && (
        <p role="alert" className="text-sm leading-relaxed text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
