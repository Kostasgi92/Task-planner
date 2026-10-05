import type { ReactNode } from 'react';

export function IconButton({
  label,
  onClick,
  children,
  testId,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
    >
      {children}
    </button>
  );
}
