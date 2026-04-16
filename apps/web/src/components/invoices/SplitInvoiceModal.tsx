import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { formatCLP } from '@wildlama/shared';
import { cn } from '@/lib/utils';

interface SplitLine {
  id: string;
  costCenterId: string;
  accountCode: string;
  monto: number;
}

interface SplitInvoiceModalProps {
  invoice: {
    id: string;
    montoNeto: number | string;
  };
  isOpen: boolean;
  onClose: () => void;
}

function newLine(): SplitLine {
  return { id: crypto.randomUUID(), costCenterId: '', accountCode: '', monto: 0 };
}

export function SplitInvoiceModal({ invoice, isOpen, onClose }: SplitInvoiceModalProps) {
  const montoNeto = Number(invoice.montoNeto);

  const [lines, setLines] = useState<SplitLine[]>([newLine(), newLine()]);

  const { data: costCenters = [] } = useQuery({
    queryKey: ['invoices-meta-cost-centers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices/meta/cost-centers');
      return data as Array<{ id: string; code: string; name: string }>;
    },
    enabled: isOpen,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['invoices-meta-accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices/meta/accounts');
      return data as Array<{ id: string; code: string; name: string }>;
    },
    enabled: isOpen,
  });

  const totalDistribuido = lines.reduce((sum, l) => sum + (l.monto || 0), 0);
  const totalOk = Math.abs(totalDistribuido - montoNeto) < 1;
  const pct = (monto: number) =>
    montoNeto > 0 ? ((monto / montoNeto) * 100).toFixed(1) : '0.0';

  const updateLine = (id: string, field: keyof SplitLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSave = () => {
    toast.info('Funcionalidad en desarrollo');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Dividir Factura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Monto neto a distribuir:{' '}
            <span className="font-semibold text-foreground">{formatCLP(montoNeto)}</span>
          </p>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">CECO</th>
                  <th className="text-left py-2 pr-2 font-medium">Cuenta</th>
                  <th className="text-right py-2 pr-2 font-medium">Monto Neto</th>
                  <th className="text-right py-2 pr-2 font-medium">%</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <Select
                        value={line.costCenterId}
                        onValueChange={(v) => updateLine(line.id, 'costCenterId', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="CECO..." />
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
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={line.accountCode}
                        onValueChange={(v) => updateLine(line.id, 'accountCode', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Cuenta..." />
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
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        className="h-8 text-right text-xs w-32"
                        value={line.monto || ''}
                        onChange={(e) =>
                          updateLine(line.id, 'monto', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {pct(line.monto)}%
                    </td>
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Agregar línea */}
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar línea
          </Button>

          {/* Total */}
          <div
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium',
              totalOk ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            )}
          >
            <span>Total distribuido</span>
            <span>
              {formatCLP(totalDistribuido)} / {formatCLP(montoNeto)} (
              {montoNeto > 0 ? ((totalDistribuido / montoNeto) * 100).toFixed(1) : '0.0'}%)
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!totalOk}>
            Guardar distribución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
