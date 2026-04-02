import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  useInvoiceAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  getAttachmentDownloadUrl,
} from '@/api/attachments';
import { toast } from 'sonner';
import { Upload, Download, Trash2, Paperclip } from 'lucide-react';

interface AttachmentSectionProps {
  invoiceId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentSection({ invoiceId }: AttachmentSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [] } = useInvoiceAttachments(invoiceId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadAttachment.mutate(
      { invoiceId, file },
      {
        onSuccess: () => toast.success('Archivo subido'),
        onError: () => toast.error('Error al subir archivo'),
      }
    );

    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    uploadAttachment.mutate(
      { invoiceId, file },
      {
        onSuccess: () => toast.success('Archivo subido'),
        onError: () => toast.error('Error al subir archivo'),
      }
    );
  };

  const handleDelete = (attachmentId: string) => {
    deleteAttachment.mutate(
      { attachmentId },
      {
        onSuccess: () => toast.success('Archivo eliminado'),
        onError: () => toast.error('Error al eliminar archivo'),
      }
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Adjuntos</h3>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50"
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Arrastra un archivo o haz clic para seleccionar
        </p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {uploadAttachment.isPending && (
        <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment: any) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{attachment.filename}</p>
                  {attachment.size != null && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={getAttachmentDownloadUrl(attachment.id)}
                    download
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deleteAttachment.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
