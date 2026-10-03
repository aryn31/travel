"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { Country } from "@/lib/countries";
import type { PlaceSuggestion } from "@/lib/places";
import { PlaceMark, flagFor } from "@/components/ui/PlaceMark";

/**
 * Where the story happened.
 *
 * Not decoration: this one field feeds the chip on every card, the country
 * and city filters on /stories, and the weight-A half of the search vector —
 * the reason "Kotor" finds a story whose prose never says Kotor.
 *
 * Shown as the reader will see it, because a field whose effect is visible
 * somewhere else entirely is a field people skip.
 */

/** Suggestions offered at once. More than this is a list, not a hint. */
const MAX_SUGGESTIONS = 6;

/**
 * Ranks the known places against what has been typed.
 *
 * Prefix matches first, then matches anywhere, and within each the places
 * in the country already chosen — someone who has picked Italy and typed
 * "na" means Naples, not Nairobi.
 */
function suggest(
  places: PlaceSuggestion[],
  typed: string,
  country: string,
): PlaceSuggestion[] {
  const q = typed.trim().toLowerCase();
  if (!q) return [];

  const scored: { place: PlaceSuggestion; score: number }[] = [];
  for (const place of places) {
    const name = place.name.toLowerCase();
    // An exact match is not a suggestion -- there is nothing left to offer.
    if (name === q) continue;

    let score: number;
    if (name.startsWith(q)) score = 0;
    else if (name.includes(q)) score = 2;
    else continue;

    if (country && place.countryCode === country) score -= 1;
    scored.push({ place, score });
  }

  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        b.place.count - a.place.count ||
        a.place.name.localeCompare(b.place.name),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.place);
}

export function PlaceField({
  place,
  country,
  countryList,
  places,
  locked,
  onChange,
}: {
  place: string;
  country: string;
  /*
   * Resolved on the server and passed down, not computed here.
   * Intl.DisplayNames reads whichever ICU data its runtime shipped with, and
   * Node's and Chrome's disagree: "Falkland Islands" server-side against
   * "Falkland Islands (Islas Malvinas)" in the browser, which is a hydration
   * mismatch that throws away the whole tree and re-renders it.
   */
  countryList: Country[];
  /** Every place already published, for the suggestions — see lib/places.ts. */
  places: PlaceSuggestion[];
  /** Published: shown, not editable -- see isLocked in ../actions.ts. */
  locked?: boolean;
  onChange: (next: { place: string; country: string }) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(
    () => suggest(places, place, country),
    [places, place, country],
  );
  const showing = open && !locked && matches.length > 0;

  function pick(s: PlaceSuggestion) {
    /*
     * Takes the country with it. Picking "Naples 🇮🇹" and then being asked
     * which country Naples is in would be a strange thing to be asked, and
     * the dropdown is right there if the answer is ever wrong.
     */
    onChange({ place: s.name, country: s.countryCode ?? country });
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showing) {
      // Down on a closed list reopens it rather than doing nothing.
      if (e.key === "ArrowDown" && matches.length > 0) {
        setOpen(true);
        setHighlighted(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      setHighlighted((i) => (i + 1) % matches.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlighted((i) => (i - 1 + matches.length) % matches.length);
      e.preventDefault();
    } else if (e.key === "Enter") {
      // Only swallowed while a suggestion is highlighted; otherwise Enter
      // still belongs to whatever the browser would do with it.
      pick(matches[highlighted]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
    }
  }

  /* No panel of its own: place and tags share one box in Editor.tsx. They
     are the same question asked twice -- where, and what about -- and two
     adjacent bordered cards made them look unrelated. */
  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="relative min-w-[12rem] flex-1">
          <label
            htmlFor="place-name"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            City or place
          </label>
          <input
            id="place-name"
            ref={inputRef}
            value={place}
            onChange={(e) => {
              onChange({ place: e.target.value, country });
              setOpen(true);
              setHighlighted(0);
            }}
            onFocus={() => setOpen(true)}
            /* A blur that lands on the list itself is handled by the list's
               own onMouseDown, which cancels the blur before it happens. */
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            readOnly={locked}
            placeholder={locked ? "" : "Naples, Busan, Cape Coast…"}
            maxLength={120}
            autoComplete="off"
            role="combobox"
            aria-expanded={showing}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showing ? `${listId}-${highlighted}` : undefined
            }
            className="w-full rounded-lg border border-rule bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />

          {showing && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Places already written about"
              /* Keeps the focus in the input so the blur never fires and the
                 list is still mounted by the time the click lands. */
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-rule bg-background py-1 shadow-[var(--shadow)]"
            >
              {matches.map((s, i) => (
                <li
                  key={`${s.name}-${s.countryCode ?? ""}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === highlighted}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => pick(s)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                    i === highlighted ? "bg-surface-hover" : ""
                  }`}
                >
                  {s.countryCode && (
                    <span aria-hidden className="leading-none">
                      {flagFor(s.countryCode)}
                    </span>
                  )}
                  <span className="truncate">{s.name}</span>
                  {/* The count is the argument: it says other people call it
                      this, which is the whole reason to pick rather than
                      type. */}
                  <span className="ml-auto shrink-0 text-xs text-faint">
                    {s.count} {s.count === 1 ? "story" : "stories"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-[10rem]">
          <label
            htmlFor="place-country"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Country
          </label>
          <select
            id="place-country"
            value={country}
            onChange={(e) => onChange({ place, country: e.target.value })}
            disabled={locked}
            className="w-full rounded-lg border border-rule bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          >
            <option value="">—</option>
            {countryList.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-faint">
        {place.trim() ? (
          <>
            <span>Readers will see</span>
            <PlaceMark place={place.trim()} countryCode={country || null} size="sm" />
          </>
        ) : (
          <span>
            Optional — but it puts your story in the country and city filters
            and makes the place searchable.
          </span>
        )}
      </p>
    </div>
  );
}
