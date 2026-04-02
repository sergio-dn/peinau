import { Button } from '@/components/ui/Button';
import { CheckCircle, X } from 'lucide-react';

interface BulkApprovalToolbarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onClearSelection: () => void;
  isApproving: boolean;
}

export function BulkApprovalToolbar({
  selectedCount,
  onApproveAll,
  onClearSelection,
  isApproving,
}: BulkApprovalToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-4 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-md">
      <span className="text-sm font-medium">
        {selectedCount} factura{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-sm underline underline-offset-2 hover:opacity-80"
          onClick={onClearSelection}
        >
          <X className="mr-1 inline h-3 w-3" />
          Limpiar seleccion
        </button>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={onApproveAll}
          disabled={isApproving}
        >
          <CheckCircle className="mr-1 h-4 w-4" />
          {isApproving ? 'Aprobando...' : 'Aprobar Seleccionadas'}
        </Button>
      </div>
    </div>
  );
}
