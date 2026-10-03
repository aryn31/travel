"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { uploadImage } from "@/lib/upload-client";
import { docToText } from "@/lib/story-doc";
import { StoryImage } from "./extensions";
import { Toolbar } from "./Toolbar";
import { PlaceField } from "./PlaceField";
import { TagField } from "./TagField";
import type { Country } from "@/lib/countries";
import type { PlaceSuggestion } from "@/lib/places";
import type { StoryTag } from "@/lib/tags-rules";
import {
  deleteStory,
  publishStory,
  saveStory,
  setCover,
  unpublishStory,
} from "../actions";

type SaveState =
  | { kind: "clean" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

// id, not object identity: the progress callback replaces the entry object on
// every tick, so identity-based removal would never match and the upload would
// appear to run forever.
type Upload = { id: string; name: string; progress: number };

const AUTOSAVE_MS = 1200;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function Editor({
  storyId,
  initialTitle,
  initialDoc,
  status,
  publicUrl,
  initialCover,
  initialPlace,
  initialCountry,
  countryList,
  places,
  initialTags,
  tagSuggestions,
}: {
  storyId: string;
  initialTitle: string;
  initialDoc: unknown;
  status: "draft" | "published" | "unlisted";
  publicUrl: string | null;
  initialCover: { id: string; url: string } | null;
  initialPlace: string;
  initialCountry: string;
  countryList: Country[];
  places: PlaceSuggestion[];
  initialTags: string;
  tagSuggestions: StoryTag[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [place, setPlace] = useState({
    place: initialPlace,
    country: initialCountry,
  });
  const [tagInput, setTagInput] = useState(initialTags);
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  const [publishError, setPublishError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cover, setCoverState] = useState(initialCover);
  const [pending, startTransition] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  // Same reason as the title: flush() reads the latest value from a ref so a
  // save in flight never writes a stale place back over a newer edit.
  const placeRef = useRef(place);
  const tagsRef = useRef(tagInput);
  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  useEffect(() => {
    tagsRef.current = tagInput;
  }, [tagInput]);

  // Toolbar state (which mark is active, what's selected) lives in the editor,
  // not in React -- re-render on each transaction so the buttons stay honest.
  const [, bumpToolbar] = useReducer((n: number) => n + 1, 0);
  // Seeded from the loaded document rather than synced in an effect, which
  // would cost an extra render on every mount.
  const [words, setWords] = useState(() => countWords(docToText(initialDoc)));

  const editor = useEditor({
    // Required under SSR: rendering immediately would mismatch hydration.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https"],
      }),
      StoryImage,
      Placeholder.configure({ placeholder: "Where did you go?" }),
    ],
    content: (initialDoc as object) ?? undefined,
    editorProps: {
      attributes: {
        class: "prose-none min-h-[50vh] outline-none text-lg",
        "aria-label": "Story",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return false;
        event.preventDefault();
        void handleFiles(images);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(
          (event as DragEvent).dataTransfer?.files ?? [],
        );
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return false;
        event.preventDefault();
        void handleFiles(images);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      setWords(countWords(e.getText()));
      schedule();
    },
    onSelectionUpdate: () => bumpToolbar(),
    onTransaction: () => bumpToolbar(),
  });

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!editor) return;

    setSave({ kind: "saving" });
    try {
      // ProseMirror builds attribute objects that React's Server Function
      // serializer refuses to pass through, and the failure surfaces on the
      // server as "cannot dot into a temporary client reference". A JSON
      // round-trip guarantees plain objects.
      const doc = JSON.parse(JSON.stringify(editor.getJSON()));
      const sentPlace = placeRef.current.place;
      const result = await saveStory(
        storyId,
        titleRef.current,
        doc,
        { placeName: sentPlace, countryCode: placeRef.current.country },
        tagsRef.current,
      );
      setSave(
        result.ok
          ? { kind: "saved" }
          : { kind: "error", message: result.error },
      );

      /*
       * The server may have snapped the place to the spelling it already
       * goes by, so the field catches up with what was actually stored.
       * Only if the box still holds what was sent -- the same stale-write
       * guard placeRef exists for, since the writer may have typed on while
       * this save was in flight.
       */
      if (
        result.ok &&
        result.placeName &&
        result.placeName !== sentPlace &&
        placeRef.current.place === sentPlace
      ) {
        setPlace((p) => ({ ...p, place: result.placeName! }));
      }
    } catch {
      // Without this the promise rejects unhandled and the status line sits on
      // "Saving…" forever, which reads exactly like a successful save.
      setSave({
        kind: "error",
        message: "Couldn't save — check your connection.",
      });
    }
  }, [editor, storyId]);

  const schedule = useCallback(() => {
    setPublishError(null);
    setSave({ kind: "dirty" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  async function handleFiles(files: File[]) {
    if (!editor) return;
    setUploadError(null);

    for (const file of files) {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);

      try {
        const image = await uploadImage(file, storyId, (p) =>
          setUploads((u) =>
            u.map((x) => (x.id === id ? { ...x, progress: p } : x)),
          ),
        );
        editor
          .chain()
          .focus()
          .setImage({
            src: image.url,
            alt: "",
            // Cast: the width/height attrs come from StoryImage, which the
            // stock setImage signature doesn't know about.
            ...{ width: image.width, height: image.height },
          })
          .run();
        schedule();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploads((u) => u.filter((x) => x.id !== id));
      }
    }
  }

  async function handleCover(file: File) {
    setUploadError(null);
    const id = crypto.randomUUID();
    setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);
    try {
      const image = await uploadImage(file, storyId, (p) =>
        setUploads((u) =>
          u.map((x) => (x.id === id ? { ...x, progress: p } : x)),
        ),
      );
      await setCover(storyId, image.id);
      setCoverState({ id: image.id, url: image.url });
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploads((u) => u.filter((x) => x.id !== id));
    }
  }

  useEffect(() => {
    const dirty = save.kind === "dirty" || save.kind === "saving";
    if (!dirty && uploads.length === 0) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [save.kind, uploads.length]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

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
    <div className="page flex-1 py-10">
      <div className="reading">
        <div className="mb-8 flex items-center justify-between gap-4 text-sm">
          <StatusLine state={save} status={status} publicUrl={publicUrl} />
          <div className="flex items-center gap-3">
            {status === "draft" ? (
              <button
                type="button"
                onClick={() => void onPublish()}
                disabled={pending || uploads.length > 0}
                className="rounded-full bg-foreground px-4 py-1.5 font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
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
                className="rounded-full border border-rule px-4 py-1.5 transition-colors hover:bg-surface-hover disabled:opacity-40"
              >
                Unpublish
              </button>
            )}
            <DeleteButton storyId={storyId} disabled={pending} />
          </div>
        </div>

        {publishError && (
          <p
            role="alert"
            className="mb-4 text-sm text-red-600 dark:text-red-400"
          >
            {publishError}
          </p>
        )}
        {uploadError && (
          <p
            role="alert"
            className="mb-4 text-sm text-red-600 dark:text-red-400"
          >
            {uploadError}
          </p>
        )}

        <CoverPicker
          cover={cover}
          onPick={() => coverInput.current?.click()}
          onRemove={() =>
            startTransition(async () => {
              await setCover(storyId, null);
              setCoverState(null);
              router.refresh();
            })
          }
        />

        <div className="mb-6 rounded-xl border border-rule bg-surface/60 p-4">
          <PlaceField
            place={place.place}
            country={place.country}
            countryList={countryList}
            places={places}
            onChange={(next) => {
              setPlace(next);
              schedule();
            }}
          />

          <TagField
            value={tagInput}
            suggestions={tagSuggestions}
            onChange={(next) => {
              setTagInput(next);
              schedule();
            }}
          />
        </div>

        <input
          aria-label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            schedule();
          }}
          onBlur={() => save.kind === "dirty" && void flush()}
          placeholder="Title"
          className="font-display mb-2 w-full bg-transparent text-4xl font-semibold tracking-tight outline-none placeholder:text-faint"
        />

        {editor && (
          <Toolbar
            editor={editor}
            onPickImage={() => fileInput.current?.click()}
            uploading={uploads.length > 0}
            words={words}
          />
        )}

        <EditorContent editor={editor} />

        {uploads.length > 0 && (
          <ul className="mt-6 space-y-2" aria-live="polite">
            {uploads.map((u) => (
              <li key={u.id} className="text-sm">
                <span className="text-muted">{u.name}</span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-rule">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${Math.round(u.progress * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-xs text-faint">
          Drag photos in, or paste them. They&apos;re resized to 2560px before
          upload.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void handleFiles(files);
          }}
        />
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleCover(file);
          }}
        />
      </div>
    </div>
  );
}

function CoverPicker({
  cover,
  onPick,
  onRemove,
}: {
  cover: { id: string; url: string } | null;
  onPick: () => void;
  onRemove: () => void;
}) {
  if (!cover) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="mb-8 w-full rounded-xl border border-dashed border-rule py-5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        Add a cover image
      </button>
    );
  }

  return (
    <div className="mb-6">
      {/* eslint-disable-next-line @next/next/no-img-element -- see StoryBody */}
      <img
        src={cover.url}
        alt=""
        className="h-56 w-full rounded-xl object-cover"
      />
      <div className="mt-2 flex gap-4 text-sm">
        <button
          type="button"
          onClick={onPick}
          className="underline opacity-60 hover:opacity-100"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="underline opacity-60 hover:opacity-100"
        >
          Remove cover
        </button>
      </div>
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
        state.kind === "error" ? "text-red-600 dark:text-red-400" : "text-muted"
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

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        disabled={disabled}
        className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-red-600/10 hover:text-red-600 disabled:opacity-30 dark:hover:text-red-400"
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
