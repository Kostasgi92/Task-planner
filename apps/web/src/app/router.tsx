import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@tasknest/contracts/client';
import { useEffect, useRef } from 'react';
import { Redirect, Route, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import { SignInPage, SignUpPage } from '@/features/auth/AuthPages';
import { LandingPage } from '@/features/auth/LandingPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { clearOpenStatesForUser } from '@/features/tasks/hooks/composer-storage';
import { TaskPage } from '@/features/tasks/TaskPage';
import { NotFound } from '@/pages/NotFound';

function CategoryRoute() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return <NotFound />;
  return <TaskPage key={id} categoryId={id} />;
}

function SignedInApp() {
  const [location] = useLocation();
  return (
    <AppShell>
      <ErrorBoundary resetKey={location}>
        <Switch>
          <Route path="/">
            <TaskPage />
          </Route>
          <Route path="/category/:id">
            <CategoryRoute />
          </Route>
          <Route path="/settings">
            <SettingsPage />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </ErrorBoundary>
    </AppShell>
  );
}

/**
 * Drops every cached response when the signed-in account changes, so one user's data is
 * never rendered for another — even for a moment while new requests are in flight.
 */
function useResetOnAccountChange() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const lastSignedInUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const nextUserId = userId ?? null;
    if (nextUserId && lastSignedInUserId.current && lastSignedInUserId.current !== nextUserId) {
      clearOpenStatesForUser(lastSignedInUserId.current);
    }
    if (nextUserId) lastSignedInUserId.current = nextUserId;

    if (previousUserId.current === undefined) {
      previousUserId.current = nextUserId;
      return;
    }
    if (previousUserId.current === nextUserId) return;
    previousUserId.current = nextUserId;
    queryClient.clear();
  }, [isLoaded, queryClient, userId]);
}

export function AppRoutes() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [location] = useLocation();
  // Every API call carries the current session token (set before any query runs).
  setAuthTokenGetter(() => getToken());
  useResetOnAccountChange();

  if (!isLoaded) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          Preparing your nest
        </div>
      </div>
    );
  }
  if (location.startsWith('/sign-in')) return isSignedIn ? <Redirect to="/" /> : <SignInPage />;
  if (location.startsWith('/sign-up')) return isSignedIn ? <Redirect to="/" /> : <SignUpPage />;
  // Keyed by account: switching users remounts the whole signed-in tree.
  return isSignedIn ? <SignedInApp key={userId ?? 'signed-in'} /> : <LandingPage />;
}
