import { ButtonLink } from "@/components/ui/Button";

const PROMPTS = [
  "the day nothing went to plan",
  "a meal someone made for you",
  "the bus you nearly didn't get on",
  "somebody you only met once",
  "the place you keep going back to",
];

/**
 * The page is otherwise entirely about reading. This block exists to make
 * writing feel small and possible -- concrete prompts rather than an empty
 * "share your story" box, because the hard part is never the form, it is not
 * knowing where to start.
 */
export function WriteInvite({ href }: { href: string }) {
  return (
    <div>
      <p className="eyebrow text-accent">Your turn</p>
      <h2 className="font-display mt-3 max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-5xl">
        You have been somewhere. Write about it.
      </h2>
      <p className="mt-4 max-w-md leading-relaxed text-muted">
        It does not have to be a whole trip. Most of the best pieces here are
        about an afternoon.
      </p>

      <ul className="mt-8 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <li
            key={p}
            className="rounded-full border border-accent/25 bg-background px-3.5 py-1.5 text-sm text-muted"
          >
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-9">
        <ButtonLink href={href} size="lg">
          Start writing
        </ButtonLink>
      </div>
    </div>
  );
}
