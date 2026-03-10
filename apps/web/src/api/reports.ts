import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

export function useInvoicesByState() {
  return useQuery({
    queryKey: ['reports', 'invoices-by-state'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/invoices-by-state');
      return data;
    },
  });
}

export function useAging() {
  return useQuery({
    queryKey: ['reports', 'aging'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/aging');
      return data;
    },
  });
}

export function useMonthlyVolume(year?: number) {
  return useQuery({
    queryKey: ['reports', 'monthly-volume', year],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/monthly-volume', { params: { year } });
      return data;
    },
  });
}

export function useSupplierRanking(params?: { fechaDesde?: string; fechaHasta?: string; limit?: number }) {
  return useQuery({
    queryKey: ['reports', 'supplier-ranking', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/supplier-ranking', { params });
      return data;
    },
  });
}

export function useTaxSummary(params?: { fechaDesde?: string; fechaHasta?: string }) {
  return useQuery({
    queryKey: ['reports', 'tax-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/tax-summary', { params });
      return data;
    },
  });
}
