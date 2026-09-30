"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function systemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/*
 * The stored preference lives in localStorage, which is external state, so it
 * is read through useSyncExternalStore rather than copied into React state
 * inside an effect. That also keeps the choice in sync across tabs for free.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
  }
}

/** Server has no preference to read; "system" is what the script assumed too. */
function getServerSnapshot(): Theme {
  return "system";
}

/** Writes the resolved theme onto <html>, which is what the CSS keys off. */
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemIsDark());
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="3.1" />
        <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "Match system",
    icon: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
        <path d="M5.5 14h5" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Only while following the system: react if the OS flips mid-session.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing or storage disabled: the choice still applies to
      // this page, it just won't survive a reload.
    }
    apply(next);
    listeners.forEach((l) => l());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="ml-1 flex items-center gap-0.5 rounded-full border border-rule p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={`inline-flex size-7 items-center justify-center rounded-full transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-foreground/60 hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}
