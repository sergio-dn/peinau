import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setSession, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.error('[AuthCallback] No session:', error);
          navigate('/login', { replace: true });
          return;
        }

        setSession(session);

        // Sync user with our backend DB
        try {
          const { data: profile } = await api.get('/api/auth/me');
          setUser(profile);
        } catch (syncErr) {
          console.warn('[AuthCallback] Profile sync failed:', syncErr);
        }

        navigate('/', { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
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
