import { XCircle, CheckCircle, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

interface InvoiceHistoryTimelineProps {
  history: any[];
}

function getTimelineIcon(state: string) {
  switch (state) {
    case 'rechazada':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'aprobada':
    case 'pagada':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return <Clock className="h-5 w-5 text-blue-500" />;
  }
}

function getCircleColor(state: string) {
  switch (state) {
    case 'rechazada':
      return 'border-red-500 bg-red-50';
    case 'aprobada':
    case 'pagada':
      return 'border-green-500 bg-green-50';
    default:
      return 'border-blue-500 bg-blue-50';
  }
}

export function InvoiceHistoryTimeline({ history }: InvoiceHistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin historial disponible.</p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry: any, index: number) => (
        <div key={entry.id ?? index}>
          <div className="flex gap-3 py-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                getCircleColor(entry.state ?? entry.toState)
              )}
            >
              {getTimelineIcon(entry.state ?? entry.toState)}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {entry.state ?? entry.toState}
              </p>
              {entry.userName && (
                <p className="text-xs text-muted-foreground">
                  por {entry.userName}
                </p>
              )}
              {entry.comment && (
                <p className="text-sm text-muted-foreground">{entry.comment}</p>
              )}
              {entry.createdAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString('es-CL')}
                </p>
              )}
            </div>
          </div>
          {index < history.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
