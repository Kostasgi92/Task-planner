import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode, RefObject } from 'react';
import { cx } from '@/lib/cn';

/**
 * Bottom sheet on phones, centered card on larger screens. Traps focus, closes on Escape,
 * and deliberately ignores taps outside so an unsaved form is not lost by accident.
 */
export function Modal({
  open,
  onClose,
  title,
  initialFocus,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  title: string;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-foreground/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
          <Dialog.Content
            aria-describedby={undefined}
            onPointerDownOutside={(event) => event.preventDefault()}
            onOpenAutoFocus={(event) => {
              if (!initialFocus?.current) return;
              event.preventDefault();
              initialFocus.current.focus();
            }}
            className={cx(
              'w-full rounded-t-[28px] border border-border bg-card p-6 shadow-2xl outline-none sm:rounded-[28px] sm:p-8',
              className,
            )}
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
