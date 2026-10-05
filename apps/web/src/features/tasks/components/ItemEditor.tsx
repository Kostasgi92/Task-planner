import { Plus, X } from 'lucide-react';

/** Editable checklist items ("bullet points") inside the task form. */
export function ItemEditor({
  items,
  completed,
  onChange,
}: {
  items: string[];
  completed: boolean[];
  onChange: (items: string[], completed: boolean[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-input bg-background p-2">
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: items are positional and may repeat
        <div key={index} className="flex items-center gap-2 rounded-xl px-2 transition focus-within:bg-card">
          <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
          <input
            value={item}
            onChange={(event) =>
              onChange(
                items.map((current, i) => (i === index ? event.target.value : current)),
                completed,
              )
            }
            data-testid={`input-task-item-${index}`}
            aria-label={`Item ${index + 1}`}
            placeholder="Add an item"
            maxLength={500}
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="button"
            aria-label={`Remove item ${index + 1}`}
            onClick={() =>
              onChange(
                items.filter((_, i) => i !== index),
                completed.filter((_, i) => i !== index),
              )
            }
            data-testid={`button-remove-task-item-${index}`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''], [...completed, false])}
        data-testid="button-add-task-item"
        className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-xs font-semibold text-muted-foreground transition hover:bg-card hover:text-foreground"
      >
        <Plus size={16} /> Add item
      </button>
    </div>
  );
}
