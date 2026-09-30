"use client";

import { useEffect, useRef } from "react";

/**
 * Fades a section up the first time it scrolls into view.
 *
 * Adds the class through the ref rather than through state: this fires on
 * scroll for every section on the page, and routing each one through a React
 * render just to toggle a class is work for nothing.
 *
 * Unobserves after firing -- the animation should happen once, not every time
 * the reader scrolls back past it.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /*
     * Synchronous check first, before any observer is involved. If the
     * section is already at or above the fold when this mounts -- an anchor
     * link, a restored scroll position, a reload part-way down the page --
     * it should just be visible. Waiting on an observer callback for content
     * the reader is already looking at is how sections end up stuck at
     * opacity 0.
     */
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      {
        // The top margin is enormous on purpose. With a normal margin, a
        // fast scroll (or an anchor jump, or restored scroll position) can
        // carry a section from below the fold to above it between two
        // observer deliveries. isIntersecting goes false -> false, no
        // callback fires, and the section stays at opacity 0 forever.
        //
        // Extending the root far above the viewport means anything already
        // scrolled past still counts as intersecting, so it reveals
        // immediately instead of vanishing.
        rootMargin: "10000px 0px -12% 0px",
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
