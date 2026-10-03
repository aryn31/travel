import { storiesHref, type Query } from "@/lib/search";
import { Chip } from "./Chip";

/**
 * The second level: once a country is chosen, its cities.
 *
 * Shown below the country row rather than merged into it. A single flat row
 * of every place on the site would be unreadable, and it would also suggest
 * that a country and a city are the same kind of thing -- on a travel site
 * one plainly contains the other.
 */
export function CityFilter({
  cities,
  query,
}: {
  cities: { name: string; count: number }[];
  query: Query;
}) {
  // One city is not a choice, it is the only answer.
  if (cities.length < 2 && !query.city) return null;

  const active = (name: string) =>
    query.city?.toLowerCase() === name.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1">Cities</span>

      <Chip
        href={storiesHref(query, { city: null, page: 1 })}
        active={!query.city}
      >
        All
      </Chip>

      {cities.map((c) => (
        <Chip
          key={c.name}
          href={storiesHref(query, {
            city: active(c.name) ? null : c.name,
            page: 1,
          })}
          active={active(c.name)}
        >
          {c.name}
          <span className={active(c.name) ? "ml-1.5 opacity-70" : "ml-1.5 text-faint"}>
            {c.count}
          </span>
        </Chip>
      ))}
    </div>
  );
}
