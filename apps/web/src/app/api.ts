import { useAuth } from '@clerk/react';
import {
  type GetWidgetSummaryParams,
  getGetDashboardSummaryQueryKey,
  getGetWidgetSummaryQueryKey,
  getHealthCheckQueryKey,
  getListCategoriesQueryKey,
  getListTasksQueryKey,
  type ListTasksParams,
  useGetDashboardSummary,
  useGetWidgetSummary,
  useHealthCheck,
  useListCategories,
  useListTasks,
} from '@tasknest/contracts/client';
import { accountQueryKey } from './query-keys';

// Thin wrappers over the generated hooks that key every cached response by account.

export function useCategories() {
  const { userId } = useAuth();
  return useListCategories({ query: { queryKey: accountQueryKey(getListCategoriesQueryKey(), userId) } });
}

export function useTasks(params: ListTasksParams) {
  const { userId } = useAuth();
  return useListTasks(params, {
    query: { queryKey: accountQueryKey(getListTasksQueryKey(params), userId) },
  });
}

export function useDashboardSummary() {
  const { userId } = useAuth();
  return useGetDashboardSummary({
    query: { queryKey: accountQueryKey(getGetDashboardSummaryQueryKey(), userId) },
  });
}

export function useWidgetSummary(params?: GetWidgetSummaryParams) {
  const { userId } = useAuth();
  return useGetWidgetSummary(params, {
    query: { queryKey: accountQueryKey(getGetWidgetSummaryQueryKey(params), userId) },
  });
}

export function useHealth() {
  return useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60_000 } });
}
