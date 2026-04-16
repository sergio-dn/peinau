import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { Users, Shield, Settings, Key, Bug, Clock, Copy, CheckCircle } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'settings'>('users');

  const { data: pendingUsers } = useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/users/pending');
      return data as any[];
    },
  });

  const pendingCount = pendingUsers?.length ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Administracion</h1>

      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Usuarios
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          Pendientes
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-semibold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Configuracion
        </button>
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'pending' && <PendingTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/users');
      return data;
    },
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data } = await apiClient.put(`/admin/users/${userId}`, { isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Usuario actualizado');
    },
    onError: () => toast.error('Error al actualizar usuario'),
  });

  const appUrl = window.location.origin;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitar usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Comparte este enlace. Los nuevos usuarios se registraran automaticamente con su cuenta Google y quedaran pendientes de aprobacion.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono truncate">{appUrl}</code>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Nombre</th>
                    <th className="text-left py-3 px-2 font-medium">Email</th>
                    <th className="text-left py-3 px-2 font-medium">Roles</th>
                    <th className="text-left py-3 px-2 font-medium">Estado</th>
                    <th className="text-left py-3 px-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{user.name}</td>
                      <td className="py-3 px-2">{user.email}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={user.isActive !== false ? 'success' : 'secondary'}>
                          {user.isActive !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleUserActive.mutate({
                              userId: user.id,
                              isActive: user.isActive === false,
                            })
                          }
                          disabled={toggleUserActive.isPending}
                        >
                          {user.isActive !== false ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!users || users.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const AVAILABLE_ROLES = ['admin', 'contabilidad', 'aprobador', 'visualizador', 'tesoreria', 'jefatura', 'cfo'];

function PendingTab() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/users/pending');
      return data as any[];
    },
  });

  const approveUser = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const { data } = await apiClient.put(`/admin/users/${userId}/approve`, { roles });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Usuario aprobado');
      setApprovingId(null);
    },
    onError: () => toast.error('Error al aprobar usuario'),
  });

  const toggleRole = (userId: string, role: string) => {
    setSelectedRoles((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
      };
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usuarios Pendientes de Aprobacion</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : !pendingUsers || pendingUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay usuarios pendientes de aprobacion</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user: any) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Registrado: {new Date(user.createdAt).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <Badge variant="warning" className="text-xs">Pendiente</Badge>
                </div>

                {approvingId === user.id ? (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">Selecciona roles para este usuario:</p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(user.id, role)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            (selectedRoles[user.id] ?? []).includes(role)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:bg-accent'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveUser.mutate({ userId: user.id, roles: selectedRoles[user.id] ?? [] })}
                        disabled={approveUser.isPending || (selectedRoles[user.id] ?? []).length === 0}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confirmar aprobacion
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setApprovingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setApprovingId(user.id)}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aprobar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/settings');
      return data;
    },
  });

  // SII credentials form
  const [siiRut, setSiiRut] = useState('');
  const [siiPassword, setSiiPassword] = useState('');
  const [siiApiKey, setSiiApiKey] = useState('');
  const [siiFormReady, setSiiFormReady] = useState(false);

  // Company settings form
  const [companyName, setCompanyName] = useState('');
  const [companyRut, setCompanyRut] = useState('');
  const [companyGiro, setCompanyGiro] = useState('');
  const [companyDireccion, setCompanyDireccion] = useState('');
  const [companyFormDirty, setCompanyFormDirty] = useState(false);

  // Populate forms when settings load
  if (settings && !siiFormReady) {
    if (settings.siiUsername && siiRut === '') setSiiRut(settings.siiUsername);
    if (settings.companyName && companyName === '') setCompanyName(settings.companyName);
    if (settings.rutEmpresa && companyRut === '') setCompanyRut(settings.rutEmpresa);
    if (settings.giro && companyGiro === '') setCompanyGiro(settings.giro);
    if (settings.direccion && companyDireccion === '') setCompanyDireccion(settings.direccion);
    setSiiFormReady(true);
  }

  const saveSiiCredentials = useMutation({
    mutationFn: async () => {
      await apiClient.put('/admin/sii-credentials', {
        siiUsername: siiRut,
        siiPassword: siiPassword,
        ...(siiApiKey ? { siiApiKey } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success('Credenciales SII guardadas');
      setSiiPassword('');
      setSiiApiKey('');
    },
    onError: () => toast.error('Error al guardar credenciales'),
  });

  const testSii = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/admin/sii-test');
      return data;
    },
    onSuccess: (data) => toast.success(data.message),
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Error al conectar con SII'),
  });

  const [debugResult, setDebugResult] = useState<any>(null);
  const debugSii = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/admin/sii-debug');
      return data;
    },
    onSuccess: (data) => {
      setDebugResult(data);
      const totalDocs = Object.values(data.resumen || {}).reduce((sum: number, r: any) => sum + (r?.totDocRes || 0), 0);
      toast.success(`Debug completado: ${totalDocs} documentos encontrados en ${data.periods?.length || 0} periodos`);
    },
    onError: (err: any) => {
      setDebugResult(err.response?.data || { error: err.message });
      toast.error(err.response?.data?.error || 'Error en debug SII');
    },
  });

  const saveCompanySettings = useMutation({
    mutationFn: async () => {
      await apiClient.put('/admin/settings', {
        razonSocial: companyName,
        rut: companyRut,
        giro: companyGiro,
        direccion: companyDireccion,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success('Datos de empresa actualizados');
      setCompanyFormDirty(false);
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <Key className="w-5 h-5 inline mr-2" />
            Integracion SII
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estado de conexion</p>
              <Badge variant={settings?.siiConnected ? 'success' : 'warning'}>
                {settings?.siiConnected ? 'Conectado' : 'No conectado'}
              </Badge>
              {settings?.lastSync && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ultima sync: {new Date(settings.lastSync).toLocaleString('es-CL')}
                  {settings.lastSyncStatus === 'error' && ' (con error)'}
                </p>
              )}
            </div>

            <hr />

            <div>
              <label className="text-sm font-medium block mb-1">RUT SII (usuario)</label>
              <Input
                placeholder="12345678-9"
                value={siiRut}
                onChange={(e) => setSiiRut(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                RUT del usuario con acceso al portal SII
              </p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Clave SII</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={siiPassword}
                onChange={(e) => setSiiPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Token API SII</label>
              <Input
                type="password"
                placeholder="Token del servicio SII API"
                value={siiApiKey}
                onChange={(e) => setSiiApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Token de autenticacion del servicio externo SII
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testSii.mutate()}
                disabled={testSii.isPending}
              >
                {testSii.isPending ? 'Probando...' : 'Probar Conexion'}
              </Button>
              <Button
                size="sm"
                onClick={() => saveSiiCredentials.mutate()}
                disabled={saveSiiCredentials.isPending || !siiRut || !siiPassword}
              >
                {saveSiiCredentials.isPending ? 'Guardando...' : 'Guardar Credenciales'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => debugSii.mutate()}
                disabled={debugSii.isPending || !settings?.siiConnected}
              >
                <Bug className="w-3 h-3 mr-1" />
                {debugSii.isPending ? 'Consultando...' : 'Debug RCV'}
              </Button>
            </div>
            {debugResult && (
              <div className="mt-3 p-3 bg-muted rounded text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(debugResult, null, 2)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <Settings className="w-5 h-5 inline mr-2" />
            Configuracion General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nombre de la Empresa</label>
              <Input
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setCompanyFormDirty(true); }}
                placeholder="Wild Lama SpA"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">RUT Empresa</label>
              <Input
                value={companyRut}
                onChange={(e) => { setCompanyRut(e.target.value); setCompanyFormDirty(true); }}
                placeholder="76.123.456-K"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Giro</label>
              <Input
                value={companyGiro}
                onChange={(e) => { setCompanyGiro(e.target.value); setCompanyFormDirty(true); }}
                placeholder="Servicios tecnologicos"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Direccion</label>
              <Input
                value={companyDireccion}
                onChange={(e) => { setCompanyDireccion(e.target.value); setCompanyFormDirty(true); }}
                placeholder="Santiago, Chile"
              />
            </div>
            <Button
              size="sm"
              onClick={() => saveCompanySettings.mutate()}
              disabled={saveCompanySettings.isPending || !companyFormDirty}
            >
              {saveCompanySettings.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs text-muted-foreground">Moneda: CLP (Peso Chileno)</p>
              <p className="text-xs text-muted-foreground">Zona horaria: America/Santiago</p>
              <p className="text-xs text-muted-foreground font-mono">v0.0.1</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
