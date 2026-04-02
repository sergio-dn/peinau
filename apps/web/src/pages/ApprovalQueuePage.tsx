import { useState, useMemo, useCallback } from 'react';
import { usePendingApprovals, useApproveInvoice, useRejectApproval } from '@/api/approvals';
import { ApprovalCard } from '@/components/approval/ApprovalCard';
import { BulkApprovalToolbar } from '@/components/approval/BulkApprovalToolbar';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { toast } from 'sonner';
import { CheckCircle, Search } from 'lucide-react';

export default function ApprovalQueuePage() {
  const { data: approvals, isLoading } = usePendingApprovals();
  const approveInvoice = useApproveInvoice();
  const rejectApproval = useRejectApproval();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const filteredApprovals = useMemo(() => {
    if (!approvals) return [];
    return approvals.filter((a: any) => {
      const matchesSearch =
        !searchFilter ||
        (a.razonSocialEmisor || '')
          .toLowerCase()
          .includes(searchFilter.toLowerCase());

      const amount = Number(a.montoTotal);
      const matchesMin = !minAmount || amount >= Number(minAmount);
      const matchesMax = !maxAmount || amount <= Number(maxAmount);

      return matchesSearch && matchesMin && matchesMax;
    });
  }, [approvals, searchFilter, minAmount, maxAmount]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!filteredApprovals.length) return;
    const allFilteredIds = filteredApprovals.map((a: any) => a.invoiceId);
    const allSelected = allFilteredIds.every((id: string) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }, [filteredApprovals, selectedIds]);

  const handleApprove = useCallback(
    (invoiceId: string, comment?: string) => {
      approveInvoice.mutate(
        { invoiceId, comment },
        {
          onSuccess: () => {
            toast.success('Factura aprobada');
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(invoiceId);
              return next;
            });
          },
          onError: () => toast.error('Error al aprobar'),
        }
      );
    },
    [approveInvoice]
  );

  const handleReject = useCallback(
    (invoiceId: string, reason: string) => {
      rejectApproval.mutate(
        { invoiceId, reason },
        {
          onSuccess: () => {
            toast.success('Factura rechazada');
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(invoiceId);
              return next;
            });
          },
          onError: () => toast.error('Error al rechazar'),
        }
      );
    },
    [rejectApproval]
  );

  const handleBulkApprove = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkApproving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const invoiceId of ids) {
      try {
        await approveInvoice.mutateAsync({ invoiceId });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsBulkApproving(false);
    setSelectedIds(new Set());

    if (errorCount === 0) {
      toast.success(`${successCount} factura${successCount > 1 ? 's' : ''} aprobada${successCount > 1 ? 's' : ''}`);
    } else {
      toast.warning(
        `${successCount} aprobada${successCount > 1 ? 's' : ''}, ${errorCount} con error`
      );
    }
  }, [selectedIds, approveInvoice]);

  const allFilteredSelected =
    filteredApprovals.length > 0 &&
    filteredApprovals.every((a: any) => selectedIds.has(a.invoiceId));

  const someFilteredSelected =
    filteredApprovals.some((a: any) => selectedIds.has(a.invoiceId)) &&
    !allFilteredSelected;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cola de Aprobaciones</h1>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por proveedor..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          type="number"
          placeholder="Monto min"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          className="w-full sm:w-36"
        />
        <Input
          type="number"
          placeholder="Monto max"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          className="w-full sm:w-36"
        />
      </div>

      {/* Bulk toolbar */}
      <BulkApprovalToolbar
        selectedCount={selectedIds.size}
        onApproveAll={handleBulkApprove}
        onClearSelection={() => setSelectedIds(new Set())}
        isApproving={isBulkApproving}
      />

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : !approvals || approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin aprobaciones pendientes</h3>
              <p className="text-muted-foreground">No hay facturas esperando tu aprobacion.</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
              <p className="text-muted-foreground">
                No se encontraron facturas con los filtros aplicados.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={allFilteredSelected}
              indeterminate={someFilteredSelected}
              onChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Seleccionar todas ({filteredApprovals.length})
            </span>
          </div>

          {filteredApprovals.map((approval: any) => (
            <ApprovalCard
              key={approval.id || approval.invoiceId}
              approval={approval}
              isSelected={selectedIds.has(approval.invoiceId)}
              onSelect={handleSelect}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
