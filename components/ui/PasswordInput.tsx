"use client";

import { useId, useState } from "react";
import { inputClass } from "./Field";

/**
 * A password box with a reveal toggle.
 *
 * Hiding what you type protects against someone reading over your shoulder,
 * which is a real risk in a cafe and no risk at all at a kitchen table. The
 * toggle lets the person decide which situation they are in -- and it is the
 * single cheapest fix for the mistyped-password-on-a-phone-keyboard problem,
 * which is most of what "forgot password" traffic actually is.
 */
export function PasswordInput({
  id,
  name,
  autoComplete,
  autoFocus,
  value,
  defaultValue,
  onChange,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
  /** Controlled when `value` is given, uncontrolled otherwise. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const describedBy = useId();

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        // Room for the button, so a long password never runs under it.
        className={`${inputClass} pr-11`}
        aria-describedby={describedBy}
      />

      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        // Not focusable by tab: it sits between the password field and the
        // submit button, and nobody tabbing through a sign-in form wants a
        // stop here. Still reachable by click, and by screen readers.
        tabIndex={-1}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        title={shown ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3.2" />
          {/* The struck-through eye is the "hidden" state, so the icon shows
              what pressing it will do rather than what is currently true. */}
          {shown && <path d="m4 20 16-16" />}
        </svg>
      </button>

      <span id={describedBy} className="sr-only" aria-live="polite">
        {shown ? "Password is visible" : "Password is hidden"}
      </span>
    </div>
  );
}
