import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useInvoiceTags, useAddInvoiceTag, useRemoveInvoiceTag } from '@/api/invoices';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

interface InvoiceTagsSectionProps {
  invoiceId: string;
}

export function InvoiceTagsSection({ invoiceId }: InvoiceTagsSectionProps) {
  const [newTag, setNewTag] = useState('');
  const { data: tags = [] } = useInvoiceTags(invoiceId);
  const addTag = useAddInvoiceTag();
  const removeTag = useRemoveInvoiceTag();

  const handleAdd = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;

    addTag.mutate(
      { invoiceId, tag: trimmed },
      {
        onSuccess: () => {
          setNewTag('');
          toast.success('Etiqueta agregada');
        },
        onError: () => toast.error('Error al agregar etiqueta'),
      }
    );
  };

  const handleRemove = (tagId: string) => {
    removeTag.mutate(
      { invoiceId, tagId },
      {
        onSuccess: () => toast.success('Etiqueta eliminada'),
        onError: () => toast.error('Error al eliminar etiqueta'),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Etiquetas</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag: any) => (
          <Badge key={tag.id} variant="secondary" className="gap-1">
            {tag.name ?? tag.tag}
            <button
              onClick={() => handleRemove(tag.id)}
              className="ml-1 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nueva etiqueta..."
          className="h-8"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!newTag.trim() || addTag.isPending}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>
    </div>
  );
}
