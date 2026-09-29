"use client";

import { useEffect, useState } from "react";

/**
 * The header is fixed so the hero can run full-bleed behind it. That works
 * until the page scrolls and story covers slide underneath, at which point the
 * nav needs something to sit on. Backdrop appears only once there's content
 * behind it.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll(); // a reload part-way down the page starts scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled
          // /80 still let a bright story cover bleed through enough to wash
          // out the nav; /95 keeps it readable whatever scrolls underneath.
          ? "border-b border-rule bg-background/95 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      {children}
    </header>
  );
}
