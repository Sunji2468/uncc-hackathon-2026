export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[32px] leading-none tracking-[-1px] md:text-5xl md:tracking-[-1.5px]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-[620px] text-base text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
