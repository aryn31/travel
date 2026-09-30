import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { flagFor } from "@/components/ui/PlaceMark";

export type WriterCard = {
  handle: string;
  displayName: string;
  bio: string | null;
  homeCountry: string | null;
  stories: number;
  countries: string[];
};

/* One hue per card, by position -- the same six-colour set the story cards
   use, so the page reads as one publication rather than each module
   inventing its own palette. */
const HUES = [
  {
    border: "border-sea/50",
    dash: "border-sea/40",
    solid: "bg-sea",
    text: "text-sea",
    glow: "hover:shadow-[0_22px_50px_-24px_var(--sea)]",
  },
  {
    border: "border-plum/50",
    dash: "border-plum/40",
    solid: "bg-plum",
    text: "text-plum",
    glow: "hover:shadow-[0_22px_50px_-24px_var(--plum)]",
  },
  {
    border: "border-sun/50",
    dash: "border-sun/40",
    solid: "bg-sun",
    text: "text-sun",
    glow: "hover:shadow-[0_22px_50px_-24px_var(--sun)]",
  },
  {
    border: "border-indigo/50",
    dash: "border-indigo/40",
    solid: "bg-indigo",
    text: "text-indigo",
    glow: "hover:shadow-[0_22px_50px_-24px_var(--indigo)]",
  },
  {
    border: "border-accent/50",
    dash: "border-accent/40",
    solid: "bg-accent",
    text: "text-accent",
    glow: "hover:shadow-[0_22px_50px_-24px_var(--accent)]",
  },
  {
    border: "border-moss/50",
    dash: "border-moss/40",
    solid: "bg-moss",
    text: "text-moss",
    glow: "hover:shadow-[0_22px_50px_-24px_var(--moss)]",
  },
];

/**
 * People, not posts. A reader who follows a writer comes back; a reader who
 * finishes one article does not. This is also the clearest signal on the
 * page that real people are behind the stories.
 *
 * Each card is built like a passport page: a colour head carrying the index
 * and a stamped story count, the portrait breaking out of that head, then
 * the details below a dashed rule.
 */
export function WritersRow({ writers }: { writers: WriterCard[] }) {
  if (writers.length === 0) return null;

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="font-display numeral-outline text-4xl font-semibold leading-none"
          >
            03
          </span>
          <h2 className="eyebrow">The people writing</h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>
        <p className="font-display mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          Nobody here is a travel brand. They went somewhere and wrote it
          down.
        </p>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {writers.map((w, i) => {
          const hue = HUES[i % HUES.length];
          const flags = w.countries
            .map((c) => flagFor(c))
            .filter(Boolean)
            .join(" ");

          return (
            <li key={w.handle}>
              <Link
                href={`/@${w.handle}`}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-background transition-all duration-300 hover:-translate-y-1.5 ${hue.border} ${hue.glow}`}
              >
                <div className={`relative h-24 ${hue.solid}`}>
                  <span
                    aria-hidden
                    className="font-display absolute left-4 top-0 select-none text-6xl font-semibold leading-none text-background/35"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* Entry stamp, tilted the way a real one never lands
                      straight. */}
                  <span
                    aria-hidden
                    className="absolute right-3 top-4 -rotate-12 rounded-md border-2 border-dashed border-background/70 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-background/90"
                  >
                    {w.stories} {w.stories === 1 ? "story" : "stories"}
                  </span>
                </div>

                {/* The portrait straddles the edge of the colour block --
                    the one element allowed to break the card's own grid. */}
                {/* relative, or the positioned colour block above paints
                    over it and the portrait is sliced in half. */}
                <div className="relative -mt-10 px-5">
                  <span className="inline-block rounded-full ring-4 ring-background">
                    <Avatar name={w.displayName} handle={w.handle} size="lg" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
                  <p className="font-display text-2xl font-semibold leading-tight decoration-2 underline-offset-4 group-hover:underline">
                    {w.displayName}
                  </p>
                  <p className={`mt-1 text-sm font-medium ${hue.text}`}>
                    @{w.handle}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                    {w.bio?.trim() ||
                      (w.homeCountry
                        ? `Writing from ${w.homeCountry}.`
                        : "Writing here.")}
                  </p>

                  <div
                    className={`mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed pt-4 ${hue.dash}`}
                  >
                    <span
                      className="text-base leading-none"
                      aria-label="Countries written about"
                    >
                      {flags || "—"}
                    </span>
                    <span
                      aria-hidden
                      className={`text-[0.65rem] font-bold uppercase tracking-[0.16em] ${hue.text}`}
                    >
                      Read
                      <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
