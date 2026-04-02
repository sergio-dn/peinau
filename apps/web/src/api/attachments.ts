import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export function useInvoiceAttachments(invoiceId: string) {
  return useQuery({
    queryKey: ['invoices', invoiceId, 'attachments'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/invoices/${invoiceId}/attachments`);
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, file }: { invoiceId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post(`/invoices/${invoiceId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', vars.invoiceId, 'attachments'] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attachmentId }: { attachmentId: string }) => {
      const { data } = await apiClient.delete(`/attachments/${attachmentId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function getAttachmentDownloadUrl(attachmentId: string) {
  return `/api/attachments/${attachmentId}/download`;
}
