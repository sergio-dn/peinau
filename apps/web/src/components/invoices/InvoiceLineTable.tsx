import { formatCLP } from '@wildlama/shared';
import { useUpdateLineAccounting } from '@/api/invoices';
import { toast } from 'sonner';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';

interface InvoiceLineTableProps {
  lines: any[];
  accounts: any[];
  costCenters: any[];
  invoiceId: string;
  disabled?: boolean;
}

export function InvoiceLineTable({
  lines,
  accounts,
  costCenters,
  invoiceId,
  disabled = false,
}: InvoiceLineTableProps) {
  const updateAccounting = useUpdateLineAccounting();

  const handleAccountChange = (lineId: string, accountId: string) => {
    updateAccounting.mutate(
      { invoiceId, lineId, accountId: accountId || null, costCenterId: null },
      {
        onSuccess: () => toast.success('Cuenta actualizada'),
        onError: () => toast.error('Error al actualizar cuenta'),
      }
    );
  };

  const handleCostCenterChange = (lineId: string, costCenterId: string) => {
    updateAccounting.mutate(
      { invoiceId, lineId, accountId: null, costCenterId: costCenterId || null },
      {
        onSuccess: () => toast.success('Centro de costo actualizado'),
        onError: () => toast.error('Error al actualizar centro de costo'),
      }
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Cantidad</th>
            <th className="px-3 py-2 text-right">Precio Unit.</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2">Cuenta</th>
            <th className="px-3 py-2">Centro de Costo</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b">
              <td className="px-3 py-2">{line.lineNumber}</td>
              <td className="px-3 py-2">
                <div>{line.nombreItem}</div>
                {line.descripcion && (
                  <div className="text-xs text-muted-foreground">{line.descripcion}</div>
                )}
              </td>
              <td className="px-3 py-2">{line.cantidad ?? '-'}</td>
              <td className="px-3 py-2 text-right">
                {line.precioUnitario != null ? formatCLP(line.precioUnitario) : '-'}
              </td>
              <td className="px-3 py-2 text-right">{formatCLP(line.montoItem)}</td>
              <td className="px-3 py-2">
                <Select
                  value={line.accountId ?? ''}
                  onValueChange={(value) => handleAccountChange(line.id, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2">
                <Select
                  value={line.costCenterId ?? ''}
                  onValueChange={(value) => handleCostCenterChange(line.id, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="Seleccionar CC" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc: any) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
