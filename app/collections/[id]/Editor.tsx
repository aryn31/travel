"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addStoryAction,
  deleteCollectionAction,
  moveStoryAction,
  removeStoryAction,
  setCollectionStatusAction,
  updateCollectionAction,
} from "../actions";
import {
  VISIBILITIES,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  type Visibility,
} from "@/lib/visibility";

export type Entry = {
  id: string;
  title: string;
  href: string;
  status: Visibility;
  readingMinutes: number;
  placeName: string | null;
};

/**
 * Arranging a trip.
 *
 * The whole page is one client component because every control here moves
 * something on the same list, and a server round trip per keystroke to
 * re-render a list of six would be slower than holding it.
 */
export function CollectionEditor({
  collectionId,
  initialTitle,
  initialDescription,
  status,
  entries,
  addable,
  publicHref,
}: {
  collectionId: string;
  initialTitle: string;
  initialDescription: string;
  status: Visibility;
  entries: Entry[];
  addable: { id: string; title: string; status: Visibility }[];
  publicHref: string;
}) {
  const router = useRouter();

  /*
   * The order lives here, not in the props.
   *
   * Every control on this page moves something in the same list, and
   * waiting for a server round trip to repaint a list of six is both slow
   * and unreliable -- router.refresh() raced the revalidation and painted
   * the old order. Applying the change locally and rolling back on failure
   * is instant and cannot be stale.
   */
  const [items, setItems] = useState(entries);
  const [pool, setPool] = useState(addable);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * Applies a change at once, and puts it back if the server says no.
   *
   * `rollback` is the state as it was, captured before the optimistic
   * update, so a rejection restores exactly what was there rather than
   * re-deriving it.
   */
  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    rollback: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        // The rest of the page -- the public link, the profile -- is the
        // server's to redraw; the list is already right.
        router.refresh();
      } else {
        rollback();
        setError(result.error ?? "That didn't work.");
      }
    });
  }

  function move(storyId: string, direction: "up" | "down") {
    const before = items;
    const index = items.findIndex((e) => e.id === storyId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);

    run(
      () => moveStoryAction(collectionId, storyId, direction),
      () => setItems(before),
    );
  }

  function take(storyId: string) {
    const before = items;
    const entry = items.find((e) => e.id === storyId);
    setItems(items.filter((e) => e.id !== storyId));
    if (entry) {
      setPool((p) => [
        { id: entry.id, title: entry.title, status: entry.status },
        ...p,
      ]);
    }

    run(
      () => removeStoryAction(collectionId, storyId),
      () => {
        setItems(before);
        setPool((p) => p.filter((s) => s.id !== storyId));
      },
    );
  }

  function put(story: { id: string; title: string; status: Visibility }) {
    const beforePool = pool;
    const beforeItems = items;
    setPool(pool.filter((s) => s.id !== story.id));
    setItems([
      ...items,
      {
        id: story.id,
        title: story.title,
        href: "",
        status: story.status,
        readingMinutes: 0,
        placeName: null,
      },
    ]);

    run(
      () => addStoryAction(collectionId, story.id),
      () => {
        setPool(beforePool);
        setItems(beforeItems);
      },
    );
  }

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------ *
       * Name and reason
       * ------------------------------------------------------------ */}
      <form
        action={(formData) => {
          setSaved(false);
          startTransition(async () => {
            const result = await updateCollectionAction(collectionId, formData);
            if (result.ok) {
              setSaved(true);
              router.refresh();
            } else setError(result.error);
          });
        }}
        className="max-w-2xl space-y-3"
      >
        <label htmlFor="title" className="sr-only">
          Name
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
          maxLength={120}
          placeholder="Name this trip"
          className="font-display w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-faint"
        />
        <label htmlFor="description" className="sr-only">
          What it was
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaved(false);
          }}
          rows={2}
          maxLength={600}
          placeholder="What held these together? (optional)"
          className="w-full resize-y rounded-xl border-2 border-rule bg-background px-4 py-3 leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
          {saved && <span className="text-sm text-muted">Saved</span>}
        </div>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------ *
       * The order
       * ------------------------------------------------------------ */}
      <section>
        <div className="mb-4 flex items-baseline gap-4">
          <h2 className="eyebrow">In order</h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>

        {items.length === 0 ? (
          <p className="py-4 text-sm text-faint">
            Nothing in this trip yet. Add a story below.
          </p>
        ) : (
          <ol className="max-w-3xl divide-y divide-rule border-y border-rule">
            {items.map((e, i) => (
              <li key={e.id} className="flex items-center gap-4 py-4">
                <span
                  aria-hidden
                  className="font-display w-8 shrink-0 text-right text-lg font-semibold tabular-nums text-faint"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  {/* A row added just now has no href until the server
                      answers; plain text until then beats a dead link. */}
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="block truncate font-medium hover:underline"
                    >
                      {e.title || "Untitled"}
                    </Link>
                  ) : (
                    <span className="block truncate font-medium">
                      {e.title || "Untitled"}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-faint">
                    {VISIBILITY_LABEL[e.status]}
                    {e.placeName && ` · ${e.placeName}`}
                    {e.readingMinutes > 0 && ` · ${e.readingMinutes} min`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Move
                    label="Move up"
                    glyph="↑"
                    disabled={pending || i === 0}
                    onClick={() => move(e.id, "up")}
                  />
                  <Move
                    label="Move down"
                    glyph="↓"
                    disabled={pending || i === items.length - 1}
                    onClick={() => move(e.id, "down")}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => take(e.id)}
                    className="ml-1 rounded-full px-2.5 py-1 text-xs text-muted transition-colors hover:text-accent disabled:opacity-40"
                  >
                    Take out
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ------------------------------------------------------------ *
       * Adding
       * ------------------------------------------------------------ */}
      {pool.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline gap-4">
            <h2 className="eyebrow">Add a story</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          {/* Your own stories only -- the server checks it too. Drafts are
              offered because a trip is often arranged while it is being
              written. */}
          <ul className="flex max-w-3xl flex-wrap gap-2">
            {pool.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => put(s)}
                  className="rounded-full border-2 border-rule px-3.5 py-1.5 text-sm transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
                >
                  {s.title || "Untitled"}
                  <span className="ml-1.5 text-xs text-faint">
                    {VISIBILITY_LABEL[s.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ *
       * Who can see it
       * ------------------------------------------------------------ */}
      <section className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Visibility</span>
          <select
            value={status}
            disabled={pending}
            onChange={(e) =>
              run(
                () =>
                  setCollectionStatusAction(
                    collectionId,
                    e.target.value as Visibility,
                  ),
                () => {},
              )
            }
            title={VISIBILITY_HINT[status]}
            className="rounded-full border border-rule bg-background px-3 py-1.5 font-medium outline-none transition-colors hover:bg-surface-hover focus:border-accent disabled:opacity-50"
          >
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABEL[v]}
              </option>
            ))}
          </select>
        </label>

        {status !== "draft" && (
          <Link
            href={publicHref}
            className="text-sm text-accent underline underline-offset-4"
          >
            View the page
          </Link>
        )}

        <form
          action={deleteCollectionAction.bind(null, collectionId)}
          className="ml-auto"
        >
          {/* No confirmation: deleting a collection does not delete a word
              of writing, only the arrangement. */}
          <button
            type="submit"
            className="text-sm text-muted transition-colors hover:text-red-600 dark:hover:text-red-400"
          >
            Delete this trip
          </button>
        </form>
      </section>
    </div>
  );
}

function Move({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-rule px-2 py-1 text-sm leading-none transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-25"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
