import { useAuth } from '@clerk/react';
import { type Category, type Task, useCreateTask, useUpdateTask } from '@tasknest/contracts/client';
import { fromDateTimeLocalValue, type Importance, toDateTimeLocalValue } from '@tasknest/domain';
import { Bell, CalendarDays, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRefreshUserData } from '@/app/query-keys';
import { IconButton } from '@/components/IconButton';
import { Modal } from '@/components/Modal';
import {
  draftKey,
  readDraft,
  removeDraft,
  type TaskComposerDraft,
  writeDraft,
} from '../hooks/composer-storage';
import { ItemEditor } from './ItemEditor';

const fieldLabel = 'mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground';
const selectClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring';

export function TaskComposer({
  categories,
  tasks,
  initialTask,
  defaultCategoryId,
  onClose: parentOnClose,
}: {
  categories: Category[];
  /** Candidates for "Nest under". */
  tasks: Task[];
  initialTask?: Task;
  defaultCategoryId?: number;
  onClose: () => void;
}) {
  const { userId } = useAuth();
  const refresh = useRefreshUserData();
  const create = useCreateTask();
  const update = useUpdateTask();
  const titleRef = useRef<HTMLInputElement>(null);

  const key = draftKey(userId, initialTask?.id, defaultCategoryId);
  const [draft] = useState(() => readDraft(key));
  const [title, setTitle] = useState(draft?.title ?? initialTask?.title ?? '');
  const [categoryId, setCategoryId] = useState(
    draft?.categoryId ?? String(initialTask?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? ''),
  );
  const [notes, setNotes] = useState(draft?.notes ?? initialTask?.notes ?? '');
  const [bulletPoints, setBulletPoints] = useState<string[]>(
    draft?.bulletPoints ?? initialTask?.bulletPoints ?? [],
  );
  const [bulletPointCompleted, setBulletPointCompleted] = useState<boolean[]>(
    draft?.bulletPointCompleted ?? initialTask?.bulletPointCompleted ?? [],
  );
  const [importance, setImportance] = useState<Importance>(
    draft?.importance ?? initialTask?.importance ?? 'medium',
  );
  const [dueAt, setDueAt] = useState(draft?.dueAt ?? toDateTimeLocalValue(initialTask?.dueAt));
  const [reminderAt, setReminderAt] = useState(
    draft?.reminderAt ?? toDateTimeLocalValue(initialTask?.reminderAt),
  );
  const [parentId, setParentId] = useState(draft?.parentId ?? String(initialTask?.parentId ?? ''));
  const [saveError, setSaveError] = useState(false);

  // The category list can arrive after the form opens.
  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(String(categories[0].id));
  }, [categories, categoryId]);

  useEffect(() => {
    writeDraft(key, {
      title,
      categoryId,
      notes,
      bulletPoints,
      bulletPointCompleted,
      importance,
      dueAt,
      reminderAt,
      parentId,
    } satisfies TaskComposerDraft);
  }, [
    key,
    title,
    categoryId,
    notes,
    bulletPoints,
    bulletPointCompleted,
    importance,
    dueAt,
    reminderAt,
    parentId,
  ]);

  const onClose = () => {
    removeDraft(key);
    parentOnClose();
  };

  const saving = create.isPending || update.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !categoryId) return;
    const items = bulletPoints
      .map((point, index) => ({ point: point.trim(), completed: bulletPointCompleted[index] === true }))
      .filter((item) => item.point);
    const data = {
      categoryId: Number(categoryId),
      parentId: parentId ? Number(parentId) : null,
      title: title.trim(),
      notes: notes.trim() || null,
      bulletPoints: items.map((item) => item.point),
      bulletPointCompleted: items.map((item) => item.completed),
      importance,
      dueAt: fromDateTimeLocalValue(dueAt),
      reminderAt: fromDateTimeLocalValue(reminderAt),
    };
    const done = () => {
      removeDraft(key);
      void refresh();
      parentOnClose();
    };
    const failed = () => setSaveError(true);
    setSaveError(false);
    if (initialTask) update.mutate({ id: initialTask.id, data }, { onSuccess: done, onError: failed });
    else create.mutate({ data }, { onSuccess: done, onError: failed });
  };

  const parentOptions = tasks.filter((task) => task.id !== initialTask?.id && !task.parentId);

  return (
    <Modal
      open
      onClose={onClose}
      title={initialTask ? 'Edit task' : 'New task'}
      initialFocus={titleRef}
      className="max-w-xl"
    >
      <form onSubmit={submit} data-testid="form-task">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
              {initialTask ? 'Refine task' : 'New task'}
            </p>
            <h2 className="font-serif text-3xl tracking-[-.04em]">
              {initialTask ? 'Make it clearer.' : 'What needs your attention?'}
            </h2>
          </div>
          <IconButton label="Close task form" onClick={onClose} testId="button-close-task-form">
            <X size={19} />
          </IconButton>
        </div>
        <div className="space-y-4">
          <input
            ref={titleRef}
            required
            maxLength={300}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            data-testid="input-task-title"
            aria-label="Task title"
            placeholder="Task title"
            className="w-full rounded-xl border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring transition placeholder:text-muted-foreground/65 focus:ring-2"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabel}>Category</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                data-testid="select-task-category"
                className={selectClass}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={fieldLabel}>Nest under</span>
              <select
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                data-testid="select-task-parent"
                className={selectClass}
              >
                <option value="">Top-level task</option>
                {parentOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={fieldLabel}>Importance</span>
            <select
              value={importance}
              onChange={(event) => setImportance(event.target.value as Importance)}
              data-testid="select-task-importance"
              className={selectClass}
            >
              <option value="high">High — Do first</option>
              <option value="medium">Medium — Keep moving</option>
              <option value="low">Low — Nice to have</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <CalendarDays size={11} /> Deadline
              </span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                data-testid="input-task-due"
                className={selectClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Bell size={11} /> Reminder
              </span>
              <input
                type="datetime-local"
                value={reminderAt}
                onChange={(event) => setReminderAt(event.target.value)}
                data-testid="input-task-reminder"
                className={selectClass}
              />
            </label>
          </div>
          <ItemEditor
            items={bulletPoints}
            completed={bulletPointCompleted}
            onChange={(items, completed) => {
              setBulletPoints(items);
              setBulletPointCompleted(completed);
            }}
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            data-testid="input-task-notes"
            aria-label="Notes"
            placeholder="A note for future you (optional)"
            rows={3}
            maxLength={5000}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/65 focus:ring-2 focus:ring-ring"
          />
        </div>
        {saveError && (
          <p data-testid="text-save-error" role="alert" className="mt-4 text-sm text-destructive">
            We couldn’t save this task. Your draft is kept — please try again.
          </p>
        )}
        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            data-testid="button-cancel-task"
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            type="submit"
            data-testid="button-save-task"
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : initialTask ? 'Save changes' : 'Add to nest'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
