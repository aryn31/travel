import Link from "next/link";

/**
 * One filter in a row of them. Shared by the country and city rows so the
 * two read as one control stack rather than as two unrelated widgets.
 */
export function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-rule bg-background text-muted hover:border-accent/50 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
