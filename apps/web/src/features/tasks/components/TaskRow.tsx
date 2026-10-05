import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Task } from '@tasknest/contracts/client';
import { formatDue, isOverdue } from '@tasknest/domain';
import { Bell, Check, Clock3, Edit3, MoreHorizontal, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cn';
import { PREFERENCES, usePreference } from '@/lib/preferences';
import { importanceLabels } from '../importance';

export function TaskRow({
  task,
  categoryColor,
  children,
  onToggle,
  onToggleBulletPoint,
  onEdit,
  onDelete,
}: {
  task: Task;
  categoryColor?: string;
  children?: ReactNode;
  onToggle: () => void;
  onToggleBulletPoint: (index: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const showReminders = usePreference(PREFERENCES.reminders);
  const due = formatDue(task.dueAt);
  const importance = importanceLabels[task.importance];
  return (
    <div
      className={cx(
        'group rounded-2xl border bg-card transition',
        task.completed
          ? 'border-border/50 opacity-70'
          : 'border-border/80 hover:border-border hover:shadow-sm',
      )}
      data-testid={`task-row-${task.id}`}
    >
      <div className="flex min-h-[70px] items-start gap-3 px-3.5 py-3 sm:px-4">
        <button
          type="button"
          onClick={onToggle}
          data-testid={`button-toggle-task-${task.id}`}
          className={cx(
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90',
            task.completed
              ? 'border-[#6e9b89] bg-[#6e9b89] text-card'
              : 'border-muted-foreground/40 hover:border-foreground',
          )}
          aria-label={task.completed ? `Mark ${task.title} active` : `Complete ${task.title}`}
        >
          {task.completed && <Check size={15} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cx(
                'truncate text-[14px] font-semibold',
                task.completed && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </p>
            <span
              data-testid={`importance-${task.id}`}
              className={cx(
                'rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                importance.className,
              )}
            >
              {importance.label}
            </span>
            {categoryColor && (
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: categoryColor }} />
            )}
          </div>
          {task.bulletPoints?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
              {task.bulletPoints.map((point, index) => {
                const completed = task.bulletPointCompleted?.[index] === true;
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: items are positional and may repeat
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => onToggleBulletPoint(index)}
                      data-testid={`button-toggle-bullet-${task.id}-${index}`}
                      aria-label={completed ? `Mark item ${index + 1} active` : `Complete item ${index + 1}`}
                      className="flex min-h-8 w-full items-center gap-2 rounded-lg px-1 text-left transition hover:bg-muted/70 active:scale-[.99]"
                    >
                      <span
                        className={cx(
                          'grid size-4 shrink-0 place-items-center rounded-full border',
                          completed
                            ? 'border-[#6e9b89] bg-[#6e9b89] text-card'
                            : 'border-muted-foreground/40',
                        )}
                      >
                        {completed ? (
                          <Check size={10} strokeWidth={3} />
                        ) : (
                          <span className="size-1 rounded-full bg-current opacity-60" />
                        )}
                      </span>
                      <span
                        className={cx(
                          'min-w-0',
                          (completed || task.completed) && 'line-through text-muted-foreground',
                        )}
                      >
                        {point}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
            {due && (
              <span className={cx('flex items-center gap-1', isOverdue(task) && 'text-destructive')}>
                <Clock3 size={11} />
                {due}
              </span>
            )}
            {task.notes && <span className="max-w-[180px] truncate">{task.notes}</span>}
            {showReminders && task.reminderAt && (
              <span title={`Reminder: ${new Date(task.reminderAt).toLocaleString()}`}>
                <Bell size={11} aria-label="Has a reminder" />
              </span>
            )}
          </div>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Task actions"
              title="Task actions"
              data-testid={`button-task-menu-${task.id}`}
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
            >
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-40 w-36 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
            >
              <DropdownMenu.Item
                onSelect={onEdit}
                data-testid={`button-edit-task-${task.id}`}
                className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-xs outline-none data-[highlighted]:bg-muted"
              >
                <Edit3 size={14} /> Edit task
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={onDelete}
                data-testid={`button-delete-task-${task.id}`}
                className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-xs text-destructive outline-none data-[highlighted]:bg-destructive/10"
              >
                <Trash2 size={14} /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {children}
    </div>
  );
}
