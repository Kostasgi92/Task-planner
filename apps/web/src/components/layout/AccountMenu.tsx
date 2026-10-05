import { useClerk, useUser } from '@clerk/react';
import { LogOut } from 'lucide-react';
import { clearAllOpenStates } from '@/features/tasks/hooks/composer-storage';

export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.firstName || email || 'Your nest';
  const initials = (user?.firstName?.[0] ?? email?.[0] ?? 'T').toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div className="mr-1 hidden text-right sm:block">
        <p className="max-w-[170px] truncate text-xs font-semibold">{name}</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Samsung ready</p>
      </div>
      <button
        type="button"
        onClick={() => {
          clearAllOpenStates();
          void signOut({ redirectUrl: '/' });
        }}
        aria-label="Sign out"
        title="Sign out"
        data-testid="button-sign-out"
        className="group grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground"
      >
        <span className="group-hover:hidden">{initials}</span>
        <LogOut size={15} className="hidden group-hover:block" />
      </button>
    </div>
  );
}
