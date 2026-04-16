import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Add Supabase session token to requests
apiClient.interceptors.request.use((config) => {
  const session = useAuthStore.getState().session;
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;

    // Retry on 503 / network error (Render free tier cold start ~30s)
    const retries = config._retries ?? 0;
    const isWakeupError = error.response?.status === 503
      || !error.response  // network/CORS error from sleeping service
    if (isWakeupError && retries < 3) {
      config._retries = retries + 1;
      const delay = [5000, 15000, 30000][retries];
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(config);
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
