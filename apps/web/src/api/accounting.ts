import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/accounting/accounts');
      return data;
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: { code: string; name: string; type: string; parentId?: string }) => {
      const { data } = await apiClient.post('/accounting/accounts', account);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; code?: string; name?: string; type?: string; isActive?: boolean }) => {
      const { data } = await apiClient.put(`/accounting/accounts/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useCostCenters() {
  return useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/accounting/cost-centers');
      return data;
    },
  });
}

export function useCreateCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (costCenter: { code: string; name: string; parentId?: string }) => {
      const { data } = await apiClient.post('/accounting/cost-centers', costCenter);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
    },
  });
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; code?: string; name?: string; isActive?: boolean }) => {
      const { data } = await apiClient.put(`/accounting/cost-centers/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
    },
  });
}
