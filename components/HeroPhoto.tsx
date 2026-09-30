/**
 * Home hero. A CSS background rather than an <img> so the photograph can
 * follow the theme: an <img src> cannot be swapped by a stylesheet, and
 * rendering both and hiding one would download two large images to show one.
 *
 * The sources and the per-theme switch live in .hero-photo in globals.css.
 * Responsive sizes are picked there too (PLAN.md §4.3 -- pre-built rather
 * than run through an optimizer).
 */
export function HeroPhoto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`hero-photo ${className}`} />;
}
