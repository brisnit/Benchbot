import { cn } from "@/lib/utils";

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  id,
  className,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 rounded-xl border border-border bg-card shadow-sm", className)}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
