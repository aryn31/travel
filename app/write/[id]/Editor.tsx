"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteStory,
  publishStory,
  saveStory,
  unpublishStory,
} from "../actions";

type SaveState =
  | { kind: "clean" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

const AUTOSAVE_MS = 1200;

export function Editor({
  storyId,
  initialTitle,
  initialBody,
  status,
  publicUrl,
}: {
  storyId: string;
  initialTitle: string;
  initialBody: string;
  status: "draft" | "published" | "unlisted";
  publicUrl: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  const [publishError, setPublishError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read by the flush path so it always sends the newest values without
  // having to be re-created every keystroke. Synced in an effect rather than
  // during render; the effect commits well before the debounce timer fires.
  const latest = useRef({ title, body });
  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSave({ kind: "saving" });
    const result = await saveStory(
      storyId,
      latest.current.title,
      latest.current.body,
    );
    setSave(
      result.ok ? { kind: "saved" } : { kind: "error", message: result.error },
    );
  }, [storyId]);

  const schedule = useCallback(() => {
    // Any edit invalidates a previous publish complaint -- leaving "give the
    // story a title" on screen after a title was typed reads as still broken.
    setPublishError(null);
    setSave({ kind: "dirty" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  // Warn before losing an unsaved edit -- the debounce window is short, but
  // a closed tab mid-window still costs the user whatever they just typed.
  useEffect(() => {
    const dirty = save.kind === "dirty" || save.kind === "saving";
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [save.kind]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function onPublish() {
    setPublishError(null);
    await flush();
    const result = await publishStory(storyId);
    if (!result.ok) {
      setPublishError(result.error);
      return;
    }
    router.push(result.url);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4 text-sm">
        <StatusLine state={save} status={status} publicUrl={publicUrl} />
        <div className="flex items-center gap-3">
          {status === "draft" ? (
            <button
              type="button"
              onClick={() => void onPublish()}
              disabled={pending}
              className="rounded-lg bg-foreground px-3.5 py-1.5 font-medium text-background hover:opacity-85 disabled:opacity-50"
            >
              Publish
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await flush();
                  await unpublishStory(storyId);
                  router.refresh();
                })
              }
              disabled={pending}
              className="rounded-lg border border-black/15 px-3.5 py-1.5 hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            >
              Unpublish
            </button>
          )}
          <DeleteButton storyId={storyId} disabled={pending} />
        </div>
      </div>

      {publishError && (
        <p role="alert" className="mb-6 text-sm text-red-600 dark:text-red-400">
          {publishError}
        </p>
      )}

      <input
        aria-label="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          schedule();
        }}
        onBlur={() => save.kind === "dirty" && void flush()}
        placeholder="Title"
        className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:opacity-30"
      />

      <textarea
        aria-label="Story"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          schedule();
        }}
        onBlur={() => save.kind === "dirty" && void flush()}
        placeholder="Where did you go?"
        rows={24}
        className="mt-6 w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:opacity-30"
      />

      <p className="mt-6 text-xs opacity-40">
        Plain text for now — the rich editor and photo uploads arrive in Week 2.
      </p>
    </div>
  );
}

function StatusLine({
  state,
  status,
  publicUrl,
}: {
  state: SaveState;
  status: string;
  publicUrl: string | null;
}) {
  const label =
    state.kind === "saving"
      ? "Saving…"
      : state.kind === "saved"
        ? "Saved"
        : state.kind === "dirty"
          ? "Unsaved changes"
          : state.kind === "error"
            ? state.message
            : status === "published"
              ? "Published"
              : "Draft";

  return (
    <p
      className={
        state.kind === "error"
          ? "text-red-600 dark:text-red-400"
          : "opacity-50"
      }
      aria-live="polite"
    >
      {label}
      {status === "published" && publicUrl && state.kind !== "error" && (
        <>
          {" · "}
          <a href={publicUrl} className="underline hover:opacity-80">
            View
          </a>
        </>
      )}
    </p>
  );
}

function DeleteButton({
  storyId,
  disabled,
}: {
  storyId: string;
  disabled: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Two-step instead of confirm(): a native dialog blocks the page, and this
  // keeps the destructive action from being one stray click away.
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        disabled={disabled}
        className="opacity-50 hover:text-red-600 hover:opacity-100 disabled:opacity-30"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => startTransition(() => void deleteStory(storyId))}
        disabled={pending}
        className="font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
      >
        {pending ? "Deleting…" : "Really delete"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="opacity-50 hover:opacity-100"
      >
        Cancel
      </button>
    </span>
  );
}
