import { cx } from '@/lib/cn';

export function StatRibbon({
  activeCount,
  completedCount,
  dueTodayCount,
  overdueCount,
}: {
  activeCount: number;
  completedCount: number;
  dueTodayCount: number;
  overdueCount: number;
}) {
  const stats = [
    { label: 'To do', value: activeCount, tone: 'text-foreground' },
    { label: 'Today', value: dueTodayCount, tone: 'text-[#b87738]' },
    { label: 'Done', value: completedCount, tone: 'text-[#4e806b]' },
    {
      label: 'Overdue',
      value: overdueCount,
      tone: overdueCount ? 'text-destructive' : 'text-muted-foreground',
    },
  ];
  return (
    <div className="mb-8 grid grid-cols-4 overflow-hidden rounded-2xl border border-border/80 bg-card">
      {stats.map((stat) => (
        <div
          key={stat.label}
          data-testid={`stat-${stat.label.toLowerCase()}`}
          className="border-r border-border/70 px-3 py-4 last:border-0 sm:px-5"
        >
          <p className={cx('font-serif text-2xl leading-none sm:text-3xl', stat.tone)}>{stat.value}</p>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
