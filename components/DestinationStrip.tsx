import Link from "next/link";
import { flagFor } from "./ui/PlaceMark";

/**
 * ISO code -> country name, from the platform rather than a lookup table we
 * would have to maintain. Falls back to the raw code for anything Intl
 * doesn't recognise.
 */
function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Countries people have actually written about, most-covered first. Doubles
 * as discovery and as the clearest signal on the page that this is a travel
 * site and not a newsletter.
 *
 * Labelled by country, not by place: the count is per country, and an earlier
 * version showed one arbitrary place name against it -- a chip reading
 * "Rhinogydd 3" that actually meant "United Kingdom, 3 stories".
 */
export function DestinationStrip({
  destinations,
}: {
  destinations: { code: string; count: number }[];
}) {
  if (destinations.length === 0) return null;

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-2">
      <ul className="flex gap-2.5">
        {destinations.map((d) => (
          <li key={d.code}>
            <Link
              href={`/?country=${d.code}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-rule bg-surface px-3.5 py-2 text-sm transition-colors hover:border-sea/40 hover:bg-surface-hover"
            >
              <span aria-hidden className="text-base leading-none">
                {flagFor(d.code) ?? "📍"}
              </span>
              <span className="whitespace-nowrap">{countryName(d.code)}</span>
              <span className="tabular-nums text-xs text-faint">{d.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
