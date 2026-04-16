import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setSession, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Use onAuthStateChange to reliably detect session after PKCE exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSession(session);

        // Sync user profile + roles from our backend
        try {
          const { data } = await api.get('/api/auth/me');
          setUser(data.user ?? data);
        } catch (syncErr) {
          console.warn('[AuthCallback] Profile sync failed:', syncErr);
        }

        setLoading(false);
        navigate('/', { replace: true });
        subscription.unsubscribe();
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session after initial check — go back to login
        setLoading(false);
        navigate('/login', { replace: true });
        subscription.unsubscribe();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, setSession, setUser, setLoading]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-600 text-sm">Iniciando sesion...</p>
      </div>
    </div>
  );
}
