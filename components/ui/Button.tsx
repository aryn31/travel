import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-85 disabled:opacity-40",
  secondary:
    "border border-rule bg-transparent hover:bg-surface-hover disabled:opacity-40",
  ghost:
    "text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40",
  danger:
    "text-red-600 hover:bg-red-600/10 dark:text-red-400 disabled:opacity-40",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:hover:translate-y-0";

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button {...props} className={`${buttonClass(variant, size)} ${className}`} />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      href={href}
      {...props}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      {children}
    </Link>
  );
}
