interface MoneyCellProps {
  amount: number | string | null | undefined;
  currency?: string;
  className?: string;
  colored?: boolean; // green if positive, red if negative
}

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const USD_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MoneyCell({ amount, currency = 'CLP', className = '', colored = false }: MoneyCellProps) {
  if (amount == null || amount === '') {
    return <span className={`tabular-nums text-slate-400 ${className}`}>—</span>;
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return <span className={`tabular-nums text-slate-400 ${className}`}>—</span>;
  }

  const formatter = currency === 'USD' ? USD_FORMATTER : CLP_FORMATTER;
  const formatted = formatter.format(num);

  const colorClass = colored
    ? num >= 0
      ? 'text-status-success-text'
      : 'text-status-danger-text'
    : '';

  return (
    <span className={`tabular-nums font-medium ${colorClass} ${className}`}>
      {formatted}
    </span>
  );
}
