import { useState } from 'react';
import { useAccounts, useCreateAccount, useCostCenters, useCreateCostCenter } from '@/api/accounting';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { Plus, BookOpen, Target } from 'lucide-react';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'cost-centers'>('accounts');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contabilidad</h1>

      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('accounts')}
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          Plan de Cuentas
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'cost-centers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('cost-centers')}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Centros de Costo
        </button>
      </div>

      {activeTab === 'accounts' ? <AccountsTab /> : <CostCentersTab />}
    </div>
  );
}

function AccountsTab() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();

  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('gasto');

  const handleCreate = () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Codigo y nombre son obligatorios');
      return;
    }
    createAccount.mutate(
      { code, name, type },
      {
        onSuccess: () => {
          toast.success('Cuenta creada');
          setShowForm(false);
          setCode('');
          setName('');
          setType('gasto');
        },
        onError: () => toast.error('Error al crear cuenta'),
      }
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Plan de Cuentas</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Nueva Cuenta
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Codigo</label>
                <Input
                  placeholder="Ej: 6100"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Ej: Gastos Generales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="activo">Activo</option>
                  <option value="pasivo">Pasivo</option>
                  <option value="patrimonio">Patrimonio</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                  <option value="costo">Costo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createAccount.isPending}>
                Crear Cuenta
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
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
                  <th className="text-left py-3 px-2 font-medium">Codigo</th>
                  <th className="text-left py-3 px-2 font-medium">Nombre</th>
                  <th className="text-left py-3 px-2 font-medium">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {accounts?.map((account: any) => (
                  <tr key={account.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-mono">{account.code}</td>
                    <td className="py-3 px-2 font-medium">{account.name}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline">{account.type}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={account.isActive !== false ? 'success' : 'secondary'}>
                        {account.isActive !== false ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!accounts || accounts.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay cuentas registradas
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

function CostCentersTab() {
  const { data: costCenters, isLoading } = useCostCenters();
  const createCostCenter = useCreateCostCenter();

  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Codigo y nombre son obligatorios');
      return;
    }
    createCostCenter.mutate(
      { code, name },
      {
        onSuccess: () => {
          toast.success('Centro de costo creado');
          setShowForm(false);
          setCode('');
          setName('');
        },
        onError: () => toast.error('Error al crear centro de costo'),
      }
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Centros de Costo</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Centro de Costo
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Codigo</label>
                <Input
                  placeholder="Ej: CC-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Ej: Departamento de TI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createCostCenter.isPending}>
                Crear Centro de Costo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
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
                  <th className="text-left py-3 px-2 font-medium">Codigo</th>
                  <th className="text-left py-3 px-2 font-medium">Nombre</th>
                  <th className="text-left py-3 px-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {costCenters?.map((cc: any) => (
                  <tr key={cc.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-mono">{cc.code}</td>
                    <td className="py-3 px-2 font-medium">{cc.name}</td>
                    <td className="py-3 px-2">
                      <Badge variant={cc.isActive !== false ? 'success' : 'secondary'}>
                        {cc.isActive !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!costCenters || costCenters.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No hay centros de costo registrados
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
