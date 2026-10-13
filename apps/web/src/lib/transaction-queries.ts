'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTransactionInput, Transaction } from '@tech-challenge/contracts';
import { apiClient } from './api-client';
import { isServiceUnavailable, RECONNECT_INTERVAL_MS } from './service-status';
import { filtersToQuery, type TransactionFilters } from './transaction-filters';

export const PENDING_REFETCH_INTERVAL_MS = 3_000;

const isPending = (transaction: Transaction) => transaction.transactionStatus.name === 'pending';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
  detail: (id: string) => ['transactions', 'detail', id] as const,
};

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => apiClient.listTransactions(filtersToQuery(filters)),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      if (query.state.status === 'error') {
        return isServiceUnavailable(query.state.error) ? RECONNECT_INTERVAL_MS : false;
      }
      return query.state.data?.data.some(isPending) ? PENDING_REFETCH_INTERVAL_MS : false;
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => apiClient.getTransaction(id),
    refetchInterval: (query) => {
      if (query.state.status === 'error') {
        return isServiceUnavailable(query.state.error) ? RECONNECT_INTERVAL_MS : false;
      }
      return query.state.data && isPending(query.state.data) ? PENDING_REFETCH_INTERVAL_MS : false;
    },
  });
}

export function useTransferTypes() {
  return useQuery({
    queryKey: ['transfer-types'],
    queryFn: apiClient.listTransferTypes,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => apiClient.createTransaction(input),
    onSuccess: async (transaction) => {
      queryClient.setQueryData(
        transactionKeys.detail(transaction.transactionExternalId),
        transaction,
      );
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
