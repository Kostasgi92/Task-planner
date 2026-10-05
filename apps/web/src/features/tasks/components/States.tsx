import { Circle } from 'lucide-react';

export function EmptyState({ title, detail, testId }: { title: string; detail?: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"
    >
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary/70 text-secondary-foreground">
        <Circle size={22} />
      </div>
      <h3 className="font-serif text-2xl tracking-[-.03em]">{title}</h3>
      {detail && <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-2" data-testid="loading-tasks" role="status" aria-label="Loading tasks">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-[72px] animate-pulse rounded-2xl border border-border/50 bg-card/60" />
      ))}
    </div>
  );
}
