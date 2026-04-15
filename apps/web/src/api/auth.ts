import { useMutation } from '@tanstack/react-query';
import apiClient from './client';

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post('/auth/login', credentials);
      return data;
    },
  });
}
