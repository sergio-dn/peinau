import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const BUSINESS_UNITS = ['Wild Lama', 'Athlas', 'Wild Wrap'] as const;

interface InvoiceCategoryFormProps {
  invoiceId: string;
  currentCostCenterId?: string | null;
  currentAccountCode?: string | null;
  companyId: string;
  onSaved?: () => void;
}

export function InvoiceCategoryForm({
  invoiceId,
  currentCostCenterId,
  currentAccountCode,
  onSaved,
}: InvoiceCategoryFormProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const canEdit = user?.roles.some((r) => ['contabilidad', 'admin'].includes(r)) ?? false;

  const [costCenterId, setCostCenterId] = useState<string>(currentCostCenterId ?? '');
  const [accountCode, setAccountCode] = useState<string>(currentAccountCode ?? '');
  const [businessUnit, setBusinessUnit] = useState<string>('');

  const { data: costCenters = [] } = useQuery({
    queryKey: ['invoices-meta-cost-centers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices/meta/cost-centers');
      return data as Array<{ id: string; code: string; name: string }>;
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['invoices-meta-accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices/meta/accounts');
      return data as Array<{ id: string; code: string; name: string }>;
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.put(`/invoices/${invoiceId}/categorize`, {
        costCenterId: costCenterId || null,
        accountCode: accountCode || null,
        businessUnit: businessUnit || null,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Imputación guardada');
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      onSaved?.();
    },
    onError: () => {
      toast.error('Error al guardar imputación');
    },
  });

  const isImputada = !!costCenterId;

  return (
    <div className="space-y-4">
      {/* Badge de estado */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            isImputada
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          )}
        >
          {isImputada ? 'Imputada \u2713' : 'Sin imputar'}
        </span>
      </div>

      {/* Centro de Costo */}
      <div className="space-y-1">
        <Label htmlFor={`cc-${invoiceId}`}>Centro de Costo (CECO)</Label>
        <Select
          value={costCenterId}
          onValueChange={setCostCenterId}
          disabled={!canEdit}
        >
          <SelectTrigger id={`cc-${invoiceId}`}>
            <SelectValue placeholder="Seleccionar CECO..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin CECO</SelectItem>
            {costCenters.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.code} — {cc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cuenta contable */}
      <div className="space-y-1">
        <Label htmlFor={`account-${invoiceId}`}>Cuenta Contable</Label>
        <Select
          value={accountCode}
          onValueChange={setAccountCode}
          disabled={!canEdit}
        >
          <SelectTrigger id={`account-${invoiceId}`}>
            <SelectValue placeholder="Seleccionar cuenta..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin cuenta</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.code}>
                {a.code} — {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Business Unit */}
      <div className="space-y-1">
        <Label htmlFor={`bu-${invoiceId}`}>Unidad de Negocio</Label>
        <Select
          value={businessUnit}
          onValueChange={setBusinessUnit}
          disabled={!canEdit}
        >
          <SelectTrigger id={`bu-${invoiceId}`}>
            <SelectValue placeholder="Seleccionar unidad..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin unidad</SelectItem>
            {BUSINESS_UNITS.map((bu) => (
              <SelectItem key={bu} value={bu}>
                {bu}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canEdit && (
        <Button
          size="sm"
          onClick={() => categorizeMutation.mutate()}
          disabled={categorizeMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {categorizeMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      )}
    </div>
  );
}
