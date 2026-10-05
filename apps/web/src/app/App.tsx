import { ClerkProvider } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@tasknest/contracts/client';
import { useLocation, Router as WouterRouter } from 'wouter';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { clerkAppearance, clerkLocalization } from '@/features/auth/clerk-appearance';
import { AppRoutes } from './router';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY (see .env.example)');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network/server hiccups, never auth or validation errors.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
});

function ClerkWithRouter() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={publishableKey as string}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
      routerPush={(to) => setLocation(to)}
      routerReplace={(to) => setLocation(to, { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <AppRoutes />
        </ConfirmProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export function App() {
  return (
    <WouterRouter>
      <ClerkWithRouter />
    </WouterRouter>
  );
}
