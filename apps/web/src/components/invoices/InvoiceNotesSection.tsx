import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useUpdateInvoiceNotes } from '@/api/invoices';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface InvoiceNotesSectionProps {
  invoiceId: string;
  initialNotes: string | null;
}

export function InvoiceNotesSection({ invoiceId, initialNotes }: InvoiceNotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const updateNotes = useUpdateInvoiceNotes();

  const handleSave = () => {
    updateNotes.mutate(
      { invoiceId, notes },
      {
        onSuccess: () => toast.success('Notas guardadas'),
        onError: () => toast.error('Error al guardar notas'),
      }
    );
  };

  const hasChanges = notes !== (initialNotes ?? '');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Notas</h3>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Agregar notas..."
        rows={4}
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!hasChanges || updateNotes.isPending}
      >
        <Save className="mr-2 h-4 w-4" />
        {updateNotes.isPending ? 'Guardando...' : 'Guardar notas'}
      </Button>
    </div>
  );
}
