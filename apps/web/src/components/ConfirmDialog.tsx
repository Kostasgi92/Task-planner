import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';

type ConfirmOptions = {
  title: string;
  detail?: string;
  confirmLabel?: string;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete?' })) …` */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        pendingRef.current?.resolve(false);
        const next = { ...options, resolve };
        pendingRef.current = next;
        setPending(next);
      }),
    [],
  );

  const settle = (ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] grid place-items-center bg-foreground/25 p-5 backdrop-blur-[2px]">
            <AlertDialog.Content
              data-testid="dialog-confirm"
              className="w-full max-w-sm rounded-[24px] border border-border bg-card p-6 shadow-2xl outline-none"
            >
              <AlertDialog.Title className="font-serif text-2xl tracking-[-.03em]">
                {pending?.title}
              </AlertDialog.Title>
              <AlertDialog.Description
                className={pending?.detail ? 'mt-2 text-sm leading-6 text-muted-foreground' : 'sr-only'}
              >
                {pending?.detail ?? pending?.title}
              </AlertDialog.Description>
              <div className="mt-6 flex justify-end gap-2">
                <AlertDialog.Cancel
                  data-testid="button-confirm-cancel"
                  className="min-h-11 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </AlertDialog.Cancel>
                <AlertDialog.Action
                  data-testid="button-confirm-ok"
                  onClick={() => settle(true)}
                  className="min-h-11 rounded-xl bg-destructive px-5 text-sm font-bold text-destructive-foreground transition hover:opacity-90"
                >
                  {pending?.confirmLabel ?? 'Delete'}
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Overlay>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
