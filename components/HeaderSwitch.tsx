"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Picks which header the page gets.
 *
 * Client-side because the pathname is: a server component cannot read it,
 * and the header is rendered once in the root layout for every route. Both
 * bars are built on the server and handed in already rendered, so this
 * decides between two finished trees rather than fetching anything.
 */
export function HeaderSwitch({
  site,
  admin,
}: {
  site: ReactNode;
  admin: ReactNode;
}) {
  const pathname = usePathname();
  // `/admin` and everything under it; never `/administration` or similar.
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  return <>{inAdmin ? admin : site}</>;
}
