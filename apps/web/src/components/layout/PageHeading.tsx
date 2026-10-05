import type { ReactNode } from 'react';

export function PageHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="font-serif text-[38px] leading-none tracking-[-.045em] sm:text-[46px]">{title}</h1>
        {detail && <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}
