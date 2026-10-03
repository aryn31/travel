"use client";

import { useMemo } from "react";
import { MAX_PER_STORY, parseTags } from "@/lib/tags-rules";

/**
 * What the story is about.
 *
 * One comma-separated text box rather than a chip editor with its own
 * backspace semantics: the parsing is the same either way, and a text field
 * can be typed into, pasted into and corrected without learning anything.
 * The chips below are a preview, not a control.
 */
export function TagField({
  value,
  suggestions,
  locked,
  onChange,
}: {
  value: string;
  /** Tags already in use, most used first -- clicking one appends it. */
  suggestions: { slug: string; label: string }[];
  /** Published: shown, not editable -- see isLocked in ../actions.ts. */
  locked?: boolean;
  onChange: (next: string) => void;
}) {
  const parsed = useMemo(() => parseTags(value), [value]);
  const chosen = new Set(parsed.map((t) => t.slug));
  const full = parsed.length >= MAX_PER_STORY;

  function add(label: string) {
    const next = value.trim();
    onChange(next ? `${next.replace(/,\s*$/, "")}, ${label}` : label);
  }

  return (
    <div className="mt-5 border-t border-rule pt-4">
      <label
        htmlFor="story-tags"
        className="mb-1.5 block text-xs font-medium text-muted"
      >
        What is it about?
      </label>
      <input
        id="story-tags"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        placeholder={locked ? "" : "solo, food, by train…"}
        className="w-full rounded-lg border border-rule bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />

      {/* The preview is what actually gets stored: commas split, blanks and
          duplicates vanish, and anything past the cap is dropped. Showing
          it means none of that is a surprise after saving. */}
      {parsed.length > 0 && (
        <p className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {parsed.map((t) => (
            <span
              key={t.slug}
              className="inline-flex items-center gap-1 rounded-md border border-plum/30 bg-plum/8 px-1.5 py-0.5 text-xs font-medium text-plum"
            >
              <span aria-hidden className="opacity-60">#</span>
              {t.label}
            </span>
          ))}
          {full && (
            <span className="text-xs text-faint">
              {MAX_PER_STORY} is the limit
            </span>
          )}
        </p>
      )}

      {suggestions.length > 0 && !full && !locked && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-faint">
          <span>In use:</span>
          {suggestions
            .filter((s) => !chosen.has(s.slug))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => add(s.label)}
                className="rounded-md border border-rule px-1.5 py-0.5 font-medium text-muted transition-colors hover:border-plum/50 hover:text-plum"
              >
                {s.label}
              </button>
            ))}
        </p>
      )}
    </div>
  );
}
