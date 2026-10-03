import type { Snippet } from "@/lib/search";

/**
 * The matched words, as Postgres found them. ts_headline already picked the
 * fragment; this only turns its markers into elements, which is why the
 * highlight is trustworthy -- it is the same match that ranked the result.
 */
export function Highlighted({ snippet }: { snippet: Snippet }) {
  return (
    <>
      {snippet.map((run, i) =>
        run.hit ? (
          <mark
            key={i}
            className="rounded bg-sun/30 px-0.5 text-foreground dark:bg-sun/25"
          >
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}
