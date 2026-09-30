import { Fragment, type ReactNode } from "react";
import { isDoc, type Node } from "@/lib/story-doc";

/**
 * Renders a TipTap doc as React. Deliberately an allow-list: any node or mark
 * type not handled here is skipped rather than rendered, so a malformed or
 * hand-crafted document can't inject anything. This is why body_json is stored
 * as JSON and not HTML (PLAN.md 4.2).
 */

function applyMarks(text: ReactNode, marks: Node["marks"], key: string): ReactNode {
  if (!marks?.length) return text;

  return marks.reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong key={key}>{acc}</strong>;
      case "italic":
        return <em key={key}>{acc}</em>;
      case "strike":
        return <s key={key}>{acc}</s>;
      case "code":
        return (
          <code key={key} className="rounded bg-black/5 px-1.5 py-0.5 text-[0.9em] dark:bg-white/10">
            {acc}
          </code>
        );
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : null;
        // Only http(s): a javascript: or data: href in stored JSON must never
        // become a live link.
        if (!href || !/^https?:\/\//i.test(href)) return acc;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            // noopener/noreferrer for safety; nofollow ugc so the site doesn't
            // become a link farm for spam signups (PLAN.md 10.8).
            rel="noopener noreferrer nofollow ugc"
            className="underline underline-offset-2 hover:opacity-70"
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderNodes(nodes: Node[] | undefined, prefix: string): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, `${prefix}-${i}`));
}

function renderNode(node: Node, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return (
        <Fragment key={key}>{applyMarks(node.text ?? "", node.marks, key)}</Fragment>
      );

    case "hardBreak":
      return <br key={key} />;

    case "paragraph":
      return (
        <p key={key} className="my-6 leading-[1.75]">
          {renderNodes(node.content, key)}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      const Tag = level === 3 ? "h3" : "h2";
      return (
        <Tag
          key={key}
          className={
            level === 3
              ? "font-display mt-11 mb-3 text-xl font-semibold tracking-tight"
              : "font-display mt-14 mb-4 text-3xl font-semibold tracking-tight"
          }
        >
          {renderNodes(node.content, key)}
        </Tag>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="font-display my-8 border-l-2 border-accent/50 pl-6 text-xl italic leading-relaxed text-foreground/85"
        >
          {renderNodes(node.content, key)}
        </blockquote>
      );

    case "bulletList":
      return (
        <ul key={key} className="my-5 list-disc space-y-1 pl-6">
          {renderNodes(node.content, key)}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="my-5 list-decimal space-y-1 pl-6">
          {renderNodes(node.content, key)}
        </ol>
      );

    case "listItem":
      return (
        <li key={key} className="[&>p]:my-0">
          {renderNodes(node.content, key)}
        </li>
      );

    case "codeBlock":
      return (
        <pre
          key={key}
          className="my-6 overflow-x-auto rounded-lg bg-black/5 p-4 text-sm dark:bg-white/10"
        >
          <code>{renderNodes(node.content, key)}</code>
        </pre>
      );

    case "horizontalRule":
      return (
        <hr key={key} className="mx-auto my-12 w-16 border-t-2 border-accent/30" />
      );

    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : null;
      // Same reasoning as links: only sources this app serves.
      if (!src || !src.startsWith("/api/media/")) return null;

      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const width = Number(node.attrs?.width) || undefined;
      const height = Number(node.attrs?.height) || undefined;

      return (
        <figure key={key} className="my-8 -mx-6 sm:mx-0">
          {/* Intrinsic width/height reserve the space before the bytes land,
              so a photo-heavy story doesn't shuffle as it loads. */}
          {/* eslint-disable-next-line @next/next/no-img-element --
              deliberate: next/image routes bytes through the host's optimizer,
              which is the one uncapped cost line on an image-heavy site.
              Images are already resized to 2560px on upload and will be served
              from a Cloudflare custom domain in front of R2 (PLAN.md 4.3, 8). */}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full sm:rounded-xl sm:shadow-[var(--shadow)]"
          />
          {alt && (
            <figcaption className="mt-3 px-6 text-sm italic text-muted sm:px-0">
              {alt}
            </figcaption>
          )}
        </figure>
      );
    }

    default:
      return null;
  }
}

export function StoryBody({ doc }: { doc: unknown }) {
  if (!isDoc(doc)) return null;
  // Story prose sits in the display serif at reading optical size -- the
  // same family as the headline, which is what makes a page read as one
  // piece rather than as a template with content poured in.
  return (
    <div className="font-display text-[1.19rem]">
      {renderNodes(doc.content, "n")}
    </div>
  );
}
