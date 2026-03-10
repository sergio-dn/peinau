import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'wildlama-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
