import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface InvoiceFilters {
  state?: string;
  supplierId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
  tipoDte?: number | string;
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

export function useUpdateInvoiceNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, notes }: { invoiceId: string; notes: string }) => {
      const { data } = await apiClient.put(`/invoices/${invoiceId}/notes`, { notes });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId] });
    },
  });
}

export function useInvoiceTags(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', invoiceId, 'tags'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/invoices/${invoiceId}/tags`);
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useAddInvoiceTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, tag }: { invoiceId: string; tag: string }) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/tags`, { tag });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId, 'tags'] });
    },
  });
}

export function useRemoveInvoiceTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, tagId }: { invoiceId: string; tagId: string }) => {
      const { data } = await apiClient.delete(`/invoices/${invoiceId}/tags/${tagId}`);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId, 'tags'] });
    },
  });
}

export function useInvoiceAssignments(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', invoiceId, 'assignments'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/invoices/${invoiceId}/assignments`);
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useAssignInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, userId, role }: { invoiceId: string; userId: string; role: string }) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/assignments`, { userId, role });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId, 'assignments'] });
    },
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, assignmentId }: { invoiceId: string; assignmentId: string }) => {
      const { data } = await apiClient.delete(`/invoices/${invoiceId}/assignments/${assignmentId}`);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId, 'assignments'] });
    },
  });
}

export function useCompanyUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users');
      return data;
    },
  });
}
