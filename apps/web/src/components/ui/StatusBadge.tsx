type StatusVariant =
  | 'pending' | 'review' | 'approved' | 'rejected' | 'paid'
  | 'received' | 'processing' | 'cancelled'
  | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<StatusVariant, string> = {
  pending:    'bg-status-pending-bg text-status-pending-text border border-status-pending-border',
  review:     'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
  approved:   'bg-status-success-bg text-status-success-text border border-status-success-border',
  rejected:   'bg-status-danger-bg text-status-danger-text border border-status-danger-border',
  paid:       'bg-status-success-bg text-status-success-text border border-status-success-border',
  received:   'bg-status-info-bg text-status-info-text border border-status-info-border',
  processing: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
  cancelled:  'bg-slate-100 text-slate-500 border border-slate-200',
  success:    'bg-status-success-bg text-status-success-text border border-status-success-border',
  warning:    'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
  danger:     'bg-status-danger-bg text-status-danger-text border border-status-danger-border',
  info:       'bg-status-info-bg text-status-info-text border border-status-info-border',
};

const spanishLabels: Record<StatusVariant, string> = {
  pending:    'Pendiente',
  review:     'En Revisión',
  approved:   'Aprobado',
  rejected:   'Rechazado',
  paid:       'Pagado',
  received:   'Recibido',
  processing: 'Procesando',
  cancelled:  'Anulado',
  success:    'Éxito',
  warning:    'Advertencia',
  danger:     'Error',
  info:       'Info',
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ variant, label, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {label ?? spanishLabels[variant]}
    </span>
  );
}
