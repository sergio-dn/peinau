import axios from 'axios';
import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase access token to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// On 401, try to refresh the session; on 503/network error retry (cold start)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;

    // Retry on 503 / network error (Render free tier cold start ~30s)
    const retries = config._retries ?? 0;
    const isWakeupError = error.response?.status === 503 || !error.response;
    if (isWakeupError && retries < 3) {
      config._retries = retries + 1;
      const delay = [5000, 15000, 30000][retries];
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return axios(error.config);
      }
    }
    return Promise.reject(error);
  }
);
