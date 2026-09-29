export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rule px-8 py-14 text-center">
      <p className="text-lg">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}
