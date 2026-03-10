import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface SupplierFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export function useSuppliers(filters: SupplierFilters = {}) {
  return useQuery({
    queryKey: ['suppliers', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/suppliers', { params: filters });
      return data;
    },
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/suppliers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: {
      rut: string;
      razonSocial: string;
      giro?: string;
      direccion?: string;
      comuna?: string;
      ciudad?: string;
      contactoNombre?: string;
      contactoEmail?: string;
      contactoTelefono?: string;
    }) => {
      const { data } = await apiClient.post('/suppliers', supplier);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data } = await apiClient.put(`/suppliers/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
