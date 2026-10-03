"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A header link that knows whether you are on it.
 *
 * Client-side rather than resolved on the server: the header renders once
 * per request, but a Link navigation swaps the page without re-rendering
 * it, so a server-computed active state would go stale the moment anyone
 * actually used the nav.
 */

/* The browser leaves "@" unencoded in the address bar and Next hands the
   same string back, but a profile handle can hold characters that do get
   percent-encoded -- so both sides are decoded before being compared. */
function decode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  /**
   * Match the path and nothing below it. Set on the profile link: reading
   * your own story at /@you/a-slug is not the same as being on /@you, and
   * lighting up the profile tab there would misreport where you are.
   */
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = decode(usePathname());
  const target = decode(href);

  // Prefix by default, so /write stays lit inside the editor at /write/123.
  const active = exact
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${
        active
          ? "bg-accent/10 font-medium text-accent"
          : "text-foreground/75 hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
