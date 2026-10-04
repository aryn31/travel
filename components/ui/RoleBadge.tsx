import type { Viewer } from "@/lib/session";

export type Role = Viewer["role"];

/**
 * Who speaks for the site.
 *
 * Two jobs at once. In the header it tells the person wearing it which
 * account they are signed in as -- which matters the moment somebody has
 * a writing account and an administrative one and has to know which hat
 * is on. Next to a name in public it tells a reader that this person can
 * remove their comment, which is worth knowing before they read the
 * comment rather than after.
 *
 * Plum rather than the accent: the accent already means "the thing on
 * this page you are meant to click", and authority is not a call to
 * action.
 */
const LABEL: Record<Exclude<Role, "user">, string> = {
  admin: "Admin",
  editor: "Editor",
};

export function RoleBadge({
  role,
  size = "md",
}: {
  role: Role;
  size?: "sm" | "md";
}) {
  if (role === "user") return null;

  return (
    <span
      title={
        role === "admin"
          ? "Can moderate reports and change roles"
          : "Can moderate reports"
      }
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-plum/40 bg-plum/10 font-semibold uppercase tracking-wider text-plum ${
        size === "sm"
          ? "px-1.5 py-0.5 text-[0.6rem]"
          : "px-2 py-0.5 text-[0.65rem]"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className={size === "sm" ? "size-2.5" : "size-3"}
        fill="currentColor"
      >
        {/* A shield. The one glyph nobody mistakes for decoration. */}
        <path d="M8 1 2.5 3.2v4.4c0 3.3 2.2 6.3 5.5 7.4 3.3-1.1 5.5-4.1 5.5-7.4V3.2Z" />
      </svg>
      {LABEL[role]}
    </span>
  );
}
