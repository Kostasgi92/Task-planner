import {
  type Category,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@tasknest/contracts/client';
import { Bell, CalendarDays, Edit3, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useCategories } from '@/app/api';
import { useRefreshUserData } from '@/app/query-keys';
import { useConfirm } from '@/components/ConfirmDialog';
import { IconButton } from '@/components/IconButton';
import { PageHeading } from '@/components/layout/PageHeading';
import { cx } from '@/lib/cn';
import { PREFERENCES, setPreference, usePreference } from '@/lib/preferences';
import { CategoryForm } from '../categories/CategoryForm';

export function SettingsPage() {
  const refresh = useRefreshUserData();
  const confirm = useConfirm();
  const { data: categories = [], isLoading, isError } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [saveError, setSaveError] = useState(false);
  const widgetOn = usePreference(PREFERENCES.widget);
  const remindersOn = usePreference(PREFERENCES.reminders);

  const openForm = (category?: Category) => {
    setSaveError(false);
    setEditing(category ?? 'new');
  };

  const save = (values: { name: string; color: string }) => {
    const done = () => {
      void refresh();
      setEditing(null);
    };
    const failed = () => setSaveError(true);
    setSaveError(false);
    if (editing === 'new') create.mutate({ data: values }, { onSuccess: done, onError: failed });
    else if (editing) update.mutate({ id: editing.id, data: values }, { onSuccess: done, onError: failed });
  };

  const deleteCategory = async (category: Category) => {
    const ok = await confirm({
      title: `Delete ${category.name}?`,
      detail:
        category.taskCount > 0
          ? `Its ${category.taskCount} task${category.taskCount === 1 ? '' : 's'} will be deleted too.`
          : undefined,
    });
    if (ok) remove.mutate({ id: category.id }, { onSuccess: () => void refresh() });
  };

  return (
    <div className="mx-auto max-w-[920px] px-5 pb-28 pt-9 sm:px-9 sm:pt-12 lg:pb-12">
      <PageHeading
        eyebrow="Personalize your space"
        title="Make it yours."
        detail="A few quiet choices to make TaskNest fit the way you actually move through a day."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_310px]">
        <section>
          <div className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl">Categories</h2>
                <p className="mt-1 text-sm text-muted-foreground">The places your tasks belong.</p>
              </div>
              <button
                type="button"
                onClick={() => openForm()}
                data-testid="button-add-category"
                className="flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground"
              >
                <Plus size={15} /> Add category
              </button>
            </div>
            {isError ? (
              <div className="rounded-2xl border border-destructive/30 p-5 text-sm">
                Categories couldn't load.{' '}
                <button type="button" onClick={() => void refresh()} className="font-bold underline">
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    data-testid={`category-setting-${category.id}`}
                    className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-border/80 bg-card px-4"
                  >
                    <span className="size-3 rounded-full" style={{ background: category.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{category.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {category.taskCount} tasks · {category.completedCount} done
                      </p>
                    </div>
                    <IconButton
                      label={`Edit ${category.name}`}
                      onClick={() => openForm(category)}
                      testId={`button-edit-category-${category.id}`}
                    >
                      <Edit3 size={16} />
                    </IconButton>
                    <IconButton
                      label={`Delete ${category.name}`}
                      onClick={() => void deleteCategory(category)}
                      testId={`button-delete-category-${category.id}`}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                ))}
                {!categories.length && (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No categories yet. Start with the shape of your day.
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-3 font-serif text-2xl">Widget & reminders</h2>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/80 bg-card">
              <PreferenceRow
                icon={<CalendarDays size={18} />}
                title="Home screen widget"
                detail="Keep your next tasks one swipe away."
                value={widgetOn}
                onChange={() => setPreference(PREFERENCES.widget, !widgetOn)}
                testId="switch-widget"
              />
              <PreferenceRow
                icon={<Bell size={18} />}
                title="Gentle reminders"
                detail="Show reminder times on your task cards."
                value={remindersOn}
                onChange={() => setPreference(PREFERENCES.reminders, !remindersOn)}
                testId="switch-reminders"
              />
            </div>
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-border/80 bg-[#e8eee6] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#557563]">
            A note from your nest
          </p>
          <p className="mt-3 font-serif text-2xl leading-7 tracking-[-.03em] text-[#254537]">
            Organized is not the same as busy.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#557563]">
            Your widget only shows what matters next, not everything you could do.
          </p>
        </aside>
      </div>
      {editing && (
        <CategoryForm
          category={editing === 'new' ? undefined : editing}
          saving={create.isPending || update.isPending}
          error={saveError}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PreferenceRow({
  icon,
  title,
  detail,
  value,
  onChange,
  testId,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  value: boolean;
  onChange: () => void;
  testId: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={onChange}
        data-testid={testId}
        className={cx('relative h-7 w-12 rounded-full p-1 transition', value ? 'bg-[#6e9b89]' : 'bg-muted')}
      >
        <span
          className={cx(
            'block size-5 rounded-full bg-card shadow-sm transition-transform',
            value && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
