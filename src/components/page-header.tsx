import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="label-micro mb-2">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
