import { ButtonLink } from "@/components/ui/Button";
import { RotatingSeal } from "./RotatingSeal";

const PROMPTS = [
  "the day nothing went to plan",
  "a meal someone made for you",
  "the bus you nearly didn't get on",
  "somebody you only met once",
  "the place you keep going back to",
];

/* Numerals only -- the prompts are a list to read, not a set of cards, and
   colouring the whole row would make five more things competing with the
   headline beside them. */
const NUMERAL_HUES = [
  "text-accent",
  "text-sea",
  "text-sun",
  "text-indigo",
  "text-plum",
];

/**
 * The page is otherwise entirely about reading. This block exists to make
 * writing feel small and possible -- concrete prompts rather than an empty
 * "share your story" box, because the hard part is never the form, it is not
 * knowing where to start.
 *
 * Two columns: the invitation at poster scale on the left, the prompts set
 * as a ruled contents list on the right. A single left-aligned column left
 * half the band empty, which read as an afterthought rather than a finish.
 */
export function WriteInvite({ href }: { href: string }) {
  return (
    <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
      {/* Ghost seal behind the prompt list. Faint enough to be texture
          rather than a second thing to look at. */}
      <RotatingSeal className="absolute -right-10 top-1/2 -z-10 hidden size-80 -translate-y-1/2 text-foreground/[0.07] lg:block" />

      <div>
        <p className="eyebrow text-accent">Your turn</p>
        <h2 className="font-display mt-4 text-balance text-4xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          You have been somewhere.
          <span className="block text-accent">Write about it.</span>
        </h2>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
          It does not have to be a whole trip. Most of the best pieces here
          are about an afternoon.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-5">
          <ButtonLink href={href} size="lg">
            Start writing
          </ButtonLink>
          <span className="text-sm text-muted">
            No word count. No deadline.
          </span>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-baseline gap-4">
          <h2 className="eyebrow">Pick one and begin</h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>

        <ul className="border-y-2 border-dashed border-rule">
          {PROMPTS.map((p, i) => (
            <li
              key={p}
              className="flex items-baseline gap-5 border-b-2 border-dashed border-rule py-4 last:border-b-0"
            >
              <span
                aria-hidden
                className={`font-display w-9 shrink-0 text-2xl font-semibold leading-none ${NUMERAL_HUES[i % NUMERAL_HUES.length]}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-balance text-xl leading-snug sm:text-2xl">
                {p}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
