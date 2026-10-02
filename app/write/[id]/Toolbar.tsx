"use client";

import type { Editor } from "@tiptap/react";
import { readingMinutes } from "@/lib/story-doc";

function Button({
  onClick,
  active,
  disabled,
  label,
  shortcut,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  shortcut?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      // TipTap already binds the keystrokes; surfacing them here is how
      // anyone finds out they exist.
      title={shortcut ? `${label}  ${shortcut}` : label}
      className={`inline-flex size-9 items-center justify-center rounded-lg transition-all disabled:opacity-30 ${
        active
          ? "bg-foreground text-background"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1.5 h-5 w-px bg-rule" />;
}

/* Icons, not abbreviations. "H2" and "1. List" made the bar read like a
   settings panel; glyphs of the thing itself are recognised without being
   read, which is what a toolbar is for. 24px grid, currentColor throughout. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  H2: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M4 6v12M12 6v12M4 12h8" />
      <path d="M16 9.5a2.5 2.5 0 0 1 4.3 1.7c0 2.3-4.3 3.6-4.3 6.8h4.5" />
    </svg>
  ),
  H3: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M4 7v10M10 7v10M4 12h6" />
      <path d="M15 8.5h4l-2.4 3a2.6 2.6 0 1 1-1.8 4.4" />
    </svg>
  ),
  Bold: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M7 5h5.5a3.5 3.5 0 0 1 0 7H7zM7 12h6.5a3.5 3.5 0 0 1 0 7H7z" />
    </svg>
  ),
  Italic: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M15 5h-5M14 19H9M14 5l-4 14" />
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M10 13a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" />
      <path d="M14 11a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5L12.5 17.5" />
    </svg>
  ),
  Quote: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path d="M9.6 6.5c-2.9 1-4.6 3.3-4.6 6.3V18h5.2v-5.2H7.9c0-1.9.9-3.2 2.6-3.9zM19.6 6.5c-2.9 1-4.6 3.3-4.6 6.3V18h5.2v-5.2h-2.3c0-1.9.9-3.2 2.6-3.9z" />
    </svg>
  ),
  Bullets: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <circle cx="4.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Numbers: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M10 7h10M10 12h10M10 17h10" />
      <path d="M4 6.5 5.2 6v3.4M3.6 14.2a1.3 1.3 0 1 1 2.1 1.5L3.6 18h2.4" strokeWidth="1.5" />
    </svg>
  ),
  Rule: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M4 12h16" />
      <path d="M6 7h12M6 17h12" strokeOpacity="0.3" />
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="m4.5 17 4.2-4.2a1.6 1.6 0 0 1 2.2 0L16 17.5" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M4 9h10a5 5 0 0 1 0 10h-3" />
      <path d="M7.5 5.5 4 9l3.5 3.5" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" {...stroke}>
      <path d="M20 9H10a5 5 0 0 0 0 10h3" />
      <path d="M16.5 5.5 20 9l-3.5 3.5" />
    </svg>
  ),
};

/* macOS writes ⌘; everything else writes Ctrl. Read once at module scope --
   it cannot change, and this is a client component so navigator exists. */
const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl+";

export function Toolbar({
  editor,
  onPickImage,
  uploading,
  words,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
  words: number;
}) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("Link URL (https://…)", previous ?? "https://");

    // Cancelled: leave the document alone.
    if (input === null) return;
    if (input.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(input.trim())) {
      // The renderer drops non-http hrefs anyway; refusing here means the
      // author finds out now rather than wondering why the link vanished.
      window.alert("Links must start with http:// or https://");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: input.trim() }).run();
  }

  // An estimate of what the byline will say, from the same function the
  // reading page uses — so it cannot drift from the published number.
  const minutes = readingMinutes(editor.getText());

  return (
    // Sticky under the fixed header so formatting stays reachable in a long
    // story without hunting for the top of the page.
    <div className="sticky top-16 z-20 -mx-6 mb-8 flex flex-wrap items-center gap-0.5 border-y border-rule bg-background/95 px-6 py-1.5 backdrop-blur-xl">
      <Button
        label="Heading"
        shortcut={`${MOD}⌥2`}
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Icon.H2 />
      </Button>
      <Button
        label="Subheading"
        shortcut={`${MOD}⌥3`}
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Icon.H3 />
      </Button>

      <Divider />

      <Button
        label="Bold"
        shortcut={`${MOD}B`}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Icon.Bold />
      </Button>
      <Button
        label="Italic"
        shortcut={`${MOD}I`}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Icon.Italic />
      </Button>
      <Button
        label="Link"
        shortcut={`${MOD}K`}
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <Icon.Link />
      </Button>

      <Divider />

      <Button
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Icon.Quote />
      </Button>
      <Button
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <Icon.Bullets />
      </Button>
      <Button
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <Icon.Numbers />
      </Button>
      <Button
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Icon.Rule />
      </Button>

      <Divider />

      <Button label="Add a photo" disabled={uploading} onClick={onPickImage}>
        <Icon.Image />
      </Button>

      <Divider />

      {/* Undo and redo exist on the keyboard already; they are here for the
          people who do not know that, which is most people. */}
      <Button
        label="Undo"
        shortcut={`${MOD}Z`}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Icon.Undo />
      </Button>
      <Button
        label="Redo"
        shortcut={`${MOD}⇧Z`}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Icon.Redo />
      </Button>

      <span className="ml-auto whitespace-nowrap pl-3 text-xs tabular-nums text-faint">
        {words.toLocaleString()} {words === 1 ? "word" : "words"}
        {minutes > 0 && ` · ${minutes} min read`}
      </span>
    </div>
  );
}
