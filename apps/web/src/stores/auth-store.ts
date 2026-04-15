import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  companyId: string;
}

interface AuthState {
  session: Session | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setSession: (session) =>
    set({ session, isAuthenticated: !!session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({ session: null, user: null, isAuthenticated: false, isLoading: false }),
}));
