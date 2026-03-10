import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface PaymentBatchFilters {
  state?: string;
  page?: number;
  limit?: number;
}

export function usePaymentBatches(filters: PaymentBatchFilters = {}) {
  return useQuery({
    queryKey: ['payment-batches', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/payment-batches', { params: filters });
      return data;
    },
  });
}

export function usePaymentBatch(id: string) {
  return useQuery({
    queryKey: ['payment-batches', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payment-batches/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePaymentBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { name: string; paymentDate: string; invoiceIds: string[] }) => {
      const { data } = await apiClient.post('/payment-batches', batch);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-batches'] });
    },
  });
}

export function useApprovePaymentBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data } = await apiClient.post(`/payment-batches/${batchId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-batches'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useExecutePaymentBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data } = await apiClient.post(`/payment-batches/${batchId}/execute`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-batches'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
