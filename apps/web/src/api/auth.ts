import { useMutation } from '@tanstack/react-query';
import apiClient from './client';
import { useAuthStore } from '@/stores/auth-store';

export function useLogin() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
    },
  });
}
