import { Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function PendingApprovalPage() {
  const { logout } = useAuthStore();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border shadow-sm p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Cuenta pendiente de aprobacion</h1>
        <p className="text-sm text-slate-500">
          Tu cuenta fue creada exitosamente. Un administrador debe aprobarla y asignarte roles antes de que puedas acceder.
        </p>
        <p className="text-xs text-slate-400">
          Recarga esta pagina una vez que te avisen que fue aprobada.
        </p>
        <div className="pt-2 flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Reintentar
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
}
