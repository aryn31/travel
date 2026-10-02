"use client";

import type { Country } from "@/lib/countries";
import { PlaceMark } from "@/components/ui/PlaceMark";

/**
 * Where the story happened.
 *
 * Not decoration: this one field feeds the chip on every card, the country
 * filter on /stories, and the weight-A half of the search vector — the
 * reason "Kotor" finds a story whose prose never says Kotor. Until now only
 * the seeder could set it, so anything written here was invisible to all
 * three.
 *
 * Shown as the reader will see it, because a field whose effect is visible
 * somewhere else entirely is a field people skip.
 */
export function PlaceField({
  place,
  country,
  countryList,
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
  onChange: (next: { place: string; country: string }) => void;
}) {

  return (
    <div className="mb-6 rounded-xl border border-rule bg-surface/60 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem] flex-1">
          <label
            htmlFor="place-name"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Where was this?
          </label>
          <input
            id="place-name"
            value={place}
            onChange={(e) => onChange({ place: e.target.value, country })}
            placeholder="Kotor, Naples, the bothy…"
            maxLength={120}
            className="w-full rounded-lg border border-rule bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
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
            Optional — but it puts your story in the country filter and makes
            the place searchable.
          </span>
        )}
      </p>
    </div>
  );
}
