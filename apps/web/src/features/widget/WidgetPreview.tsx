import type { Task } from '@tasknest/contracts/client';
import { Check, ListTodo, LoaderCircle } from 'lucide-react';
import { cx } from '@/lib/cn';

/** Preview of the phone home-screen widget: today's next tasks. */
export function WidgetPreview({
  title,
  tasks,
  isLoading,
  onToggle,
}: {
  title: string;
  tasks: Task[];
  isLoading: boolean;
  onToggle: (task: Task) => void;
}) {
  const visibleTasks = tasks.filter((task) => !task.parentId).slice(0, 6);
  return (
    <div className="rounded-[28px] border border-[#e6e6e6] bg-[#fbfbfb] p-6 text-[#252525] shadow-[0_14px_35px_rgba(37,37,37,.08)]">
      <p className="mb-5 text-[27px] font-medium tracking-[-.04em]">{title}</p>
      <div className="min-h-[154px] space-y-4">
        {isLoading ? (
          <div
            data-testid="loading-widget"
            className="flex min-h-[154px] flex-col items-center justify-center gap-3 text-sm text-[#777]"
            role="status"
          >
            <LoaderCircle className="size-5 animate-spin text-[#9970e9]" aria-hidden />
            <span>Loading your tasks…</span>
          </div>
        ) : (
          <>
            {visibleTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-4">
                <button
                  type="button"
                  aria-label={`Complete ${task.title}`}
                  data-testid={`widget-toggle-${task.id}`}
                  onClick={() => onToggle(task)}
                  className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-[2.5px] border-[#3b3b3b] bg-transparent transition hover:bg-[#f0f0f0] active:scale-95"
                >
                  {task.completed && <Check size={16} strokeWidth={3} />}
                </button>
                <span
                  className={cx(
                    'pt-0.5 text-[17px] leading-[1.3] tracking-[-.015em]',
                    task.completed && 'text-[#888] line-through',
                  )}
                >
                  {task.title}
                </span>
              </div>
            ))}
            {!visibleTasks.length && <p className="py-4 text-sm text-[#777]">Your list is clear.</p>}
          </>
        )}
      </div>
      <div className="mt-6 flex items-center gap-3 border-t border-[#ededed] pt-5">
        <span className="grid size-7 place-items-center text-[#9970e9]">
          <ListTodo size={27} strokeWidth={2.2} />
        </span>
        <span className="text-[17px] tracking-[-.015em]">To-do list</span>
      </div>
    </div>
  );
}
