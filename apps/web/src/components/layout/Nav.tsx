import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { cx } from '@/lib/cn';

export function NavItem({
  href,
  active,
  icon,
  label,
  suffix,
  testId,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  suffix?: string;
  testId: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition',
        active
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-sidebar-foreground/62 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
      )}
    >
      <span className={cx('grid place-items-center', active && 'text-sidebar-primary')}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {suffix && <span className="font-mono text-[10px] text-sidebar-foreground/35">{suffix}</span>}
    </Link>
  );
}

export function BottomNav({
  href,
  active,
  icon,
  label,
  testId,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex flex-col items-center gap-1 text-[10px] font-semibold',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        className={cx(
          'grid size-9 place-items-center rounded-xl transition',
          active && 'bg-secondary text-secondary-foreground',
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

export function CategoryDot({ color }: { color: string }) {
  return <span className="size-2.5 rounded-full" style={{ background: color }} />;
}
