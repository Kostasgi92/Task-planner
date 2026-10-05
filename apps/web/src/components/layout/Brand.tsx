import { ListTodo } from 'lucide-react';
import { Link } from 'wouter';
import { cx } from '@/lib/cn';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" data-testid="link-brand" className={cx('flex items-center gap-2.5', compact && 'gap-2')}>
      <span className="grid size-9 place-items-center rounded-[11px] bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
        <ListTodo size={19} strokeWidth={2.4} />
      </span>
      <span
        className={cx('font-serif text-[25px] font-semibold tracking-[-.045em]', compact && 'text-[20px]')}
      >
        tasknest
      </span>
    </Link>
  );
}
