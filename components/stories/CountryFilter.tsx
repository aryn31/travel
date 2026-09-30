import Link from "next/link";
import { storiesHref, type Query } from "@/lib/search";
import { flagFor } from "@/components/ui/PlaceMark";

/* Intl knows every ISO 3166-1 code and localises it; a hand-kept lookup
   table would only be a list of countries to forget to update. */
const regions = new Intl.DisplayNames(["en"], { type: "region" });

function nameFor(code: string) {
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}

export function CountryFilter({
  facets,
  query,
}: {
  facets: { code: string; count: number }[];
  query: Query;
}) {
  if (facets.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        href={storiesHref(query, { country: null, page: 1 })}
        active={!query.country}
      >
        Everywhere
      </Chip>

      {facets.map((f) => {
        const active = query.country === f.code;
        return (
          <Chip
            key={f.code}
            // Clicking the country you are already in takes it off again.
            href={storiesHref(query, {
              country: active ? null : f.code,
              page: 1,
            })}
            active={active}
          >
            <span aria-hidden className="mr-1.5 text-[1.05em] leading-none">
              {flagFor(f.code)}
            </span>
            {nameFor(f.code)}
            <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-faint"}>
              {f.count}
            </span>
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-rule bg-background text-muted hover:border-accent/50 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
