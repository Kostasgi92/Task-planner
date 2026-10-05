import type { Category } from '@tasknest/contracts/client';
import { CATEGORY_COLORS } from '@tasknest/domain';
import { X } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { Modal } from '@/components/Modal';
import { cx } from '@/lib/cn';

export function CategoryForm({
  category,
  saving,
  error,
  onSave,
  onClose,
}: {
  /** Undefined when creating a new category. */
  category?: Category;
  saving: boolean;
  error: boolean;
  onSave: (values: { name: string; color: string }) => void;
  onClose: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<string>(category?.color ?? CATEGORY_COLORS[0]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
  };

  return (
    <Modal open onClose={onClose} title="Category" initialFocus={nameRef} className="max-w-md">
      <form onSubmit={submit} data-testid="form-category">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
              Category
            </p>
            <h2 className="font-serif text-3xl">{category ? 'Give it a refresh.' : 'A new corner.'}</h2>
          </div>
          <IconButton label="Close category form" onClick={onClose} testId="button-close-category-form">
            <X size={19} />
          </IconButton>
        </div>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Name
          </span>
          <input
            ref={nameRef}
            required
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            data-testid="input-category-name"
            placeholder="e.g. Home, Studio, Errands"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <fieldset className="mt-5">
          <legend className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Color
          </legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((choice) => (
              <button
                type="button"
                key={choice}
                onClick={() => setColor(choice)}
                data-testid={`button-category-color-${choice.slice(1)}`}
                aria-label={`Choose color ${choice}`}
                aria-pressed={color === choice}
                className={cx(
                  'size-9 rounded-full transition',
                  color === choice && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                )}
                style={{ background: choice }}
              />
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            We couldn’t save this category. Please try again.
          </p>
        )}
        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            data-testid="button-cancel-category"
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            data-testid="button-save-category"
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
