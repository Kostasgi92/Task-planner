import { useAuth } from '@clerk/react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';

/**
 * Prefixes a generated query key with the signed-in user, so cached data from one account
 * can never be shown to another (e.g. after signing out and in as someone else).
 */
export function accountQueryKey(queryKey: readonly unknown[], userId: string | null | undefined) {
  const [endpoint, ...rest] = queryKey;
  return [endpoint, 'user', userId ?? 'signed-out', ...rest];
}

export function invalidateUserData(queryClient: QueryClient, userId: string | null | undefined) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[1] === 'user' && query.queryKey[2] === (userId ?? 'signed-out'),
  });
}

/** Refreshes everything shown for the current user (lists, counts, summaries, widget). */
export function useRefreshUserData() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return () => invalidateUserData(queryClient, userId);
}
