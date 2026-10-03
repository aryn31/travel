import { storiesHref, type Query } from "@/lib/search";
import { Chip } from "./Chip";
import { flagFor } from "@/components/ui/PlaceMark";
import { countryName } from "@/lib/countries";

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
        href={storiesHref(query, { country: null, city: null, page: 1 })}
        active={!query.country}
      >
        Everywhere
      </Chip>

      {facets.map((f) => {
        const active = query.country === f.code;
        return (
          <Chip
            key={f.code}
            /* Clicking the country you are already in takes it off again.
               Either way the city goes: a city filter outliving its own
               country would leave "Naples" applied while browsing Ghana. */
            href={storiesHref(query, {
              country: active ? null : f.code,
              city: null,
              page: 1,
            })}
            active={active}
          >
            <span aria-hidden className="mr-1.5 text-[1.05em] leading-none">
              {flagFor(f.code)}
            </span>
            {countryName(f.code)}
            <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-faint"}>
              {f.count}
            </span>
          </Chip>
        );
      })}
    </div>
  );
}
