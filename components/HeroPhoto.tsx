/**
 * Home hero. A plain <img> rather than next/image for the reason in
 * PLAN.md §4.3 — the optimizer is the uncapped cost line on an image-heavy
 * site — so the responsive sizes are pre-built into /public/hero.
 *
 * fetchPriority high and no lazy loading: this is the LCP element, and
 * deferring it would leave the fold empty on first paint.
 */
export function HeroPhoto({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see above
    <img
      src="/hero/sunny-day-1920.jpg"
      srcSet="/hero/sunny-day-1280.jpg 1280w, /hero/sunny-day-1920.jpg 1920w"
      sizes="100vw"
      alt=""
      aria-hidden
      width={1920}
      height={1040}
      fetchPriority="high"
      decoding="async"
      className={className}
    />
  );
}
