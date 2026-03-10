import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { Users, Shield, Plus, Settings, Key } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');

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

      {activeTab === 'users' ? <UsersTab /> : <SettingsTab />}
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/users');
      return data;
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const AVAILABLE_ROLES = ['admin', 'contabilidad', 'aprobador', 'operador', 'visualizador'];

  const createUser = useMutation({
    mutationFn: async (user: { name: string; email: string; password: string; roles: string[] }) => {
      const { data } = await apiClient.post('/admin/users', user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Usuario creado');
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Error al crear usuario'),
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

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRoles([]);
  };

  const handleCreate = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error('Debe seleccionar al menos un rol');
      return;
    }
    createUser.mutate({ name, email, password, roles: selectedRoles });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Usuarios del Sistema</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Usuario
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Juan Perez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="juan@wildlama.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contrasena</label>
                <Input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Roles</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedRoles.includes(role)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-accent'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createUser.isPending}>
                Crear Usuario
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

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
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/settings');
      return data;
    },
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
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ultima sincronizacion</p>
              <p className="font-medium">
                {settings?.lastSync
                  ? new Date(settings.lastSync).toLocaleString('es-CL')
                  : 'Nunca'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">RUT Empresa</p>
              <p className="font-mono font-medium">{settings?.rutEmpresa || '-'}</p>
            </div>
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
              <p className="text-sm text-muted-foreground">Nombre de la Empresa</p>
              <p className="font-medium">{settings?.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Moneda</p>
              <p className="font-medium">CLP (Peso Chileno)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zona horaria</p>
              <p className="font-medium">America/Santiago</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-mono text-xs">v0.0.1</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
