"use client";

import type { Editor } from "@tiptap/react";

function Button({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors disabled:opacity-30 ${
        active
          ? "bg-foreground text-background"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

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
  // Alt text belongs to the selected image, so the control only exists while
  // one is selected. Captions come from the same attribute on the reading page.
  const imageSelected = editor.isActive("image");

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

  return (
    // Sticky under the fixed header so formatting stays reachable in a long
    // story without hunting for the top of the page.
    <div className="sticky top-16 z-20 -mx-6 mb-8 flex flex-wrap items-center gap-0.5 border-y border-rule bg-background/95 px-6 py-2 backdrop-blur-xl">
      <Button
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Button>
      <Button
        label="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </Button>

      <Divider />

      <Button
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </Button>
      <Button
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </Button>
      <Button label="Link" active={editor.isActive("link")} onClick={setLink}>
        Link
      </Button>

      <Divider />

      <Button
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        &ldquo;&rdquo;
      </Button>
      <Button
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </Button>
      <Button
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </Button>
      <Button
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        —
      </Button>

      <Divider />

      <Button label="Insert image" onClick={onPickImage} disabled={uploading}>
        {uploading ? "Uploading…" : "Image"}
      </Button>

      {imageSelected && (
        <>
          <Divider />
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-xs text-muted">Alt text</span>
            <input
              value={(editor.getAttributes("image").alt as string) ?? ""}
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", { alt: e.target.value })
                  .run()
              }
              placeholder="Describe this photo"
              className="min-w-0 flex-1 rounded-md border border-rule bg-transparent px-2 py-1 text-sm outline-none placeholder:text-faint focus:border-foreground/40"
            />
          </label>
        </>
      )}

      {!imageSelected && words > 0 && (
        <span className="ml-auto hidden text-xs tabular-nums text-faint sm:block">
          {words.toLocaleString()} {words === 1 ? "word" : "words"}
        </span>
      )}
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1.5 h-5 w-px bg-rule" />;
}
