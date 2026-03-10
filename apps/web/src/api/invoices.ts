import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface InvoiceFilters {
  state?: string;
  supplierId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices', { params: filters });
      return data;
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useInvoiceHistory(id: string) {
  return useQuery({
    queryKey: ['invoices', id, 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/invoices/${id}/history`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateLineAccounting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, lineId, accountId, costCenterId }: {
      invoiceId: string; lineId: string; accountId: string | null; costCenterId: string | null;
    }) => {
      const { data } = await apiClient.put(`/invoices/${invoiceId}/lines/${lineId}/accounting`, {
        accountId, costCenterId,
      });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId] });
    },
  });
}

export function useContabilizar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/contabilizar`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRejectInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/reject`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
