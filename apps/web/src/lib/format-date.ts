import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = dateStr.includes('T') ? parseISO(dateStr) : parseISO(dateStr + 'T12:00:00');
    return format(d, 'd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatDatetime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), "d MMM yyyy, HH:mm", { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'HH:mm');
  } catch {
    return dateStr;
  }
}
