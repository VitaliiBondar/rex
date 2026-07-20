export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6 py-4 lg:h-16 lg:py-0 lg:flex-nowrap">
      <div className="flex flex-col justify-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h1>
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
