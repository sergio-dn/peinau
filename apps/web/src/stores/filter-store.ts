// apps/web/src/stores/filter-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function defaultMonth() {
  const now = new Date();
  return {
    fechaDesde: format(startOfMonth(now), 'yyyy-MM-dd'),
    fechaHasta: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

interface InvoiceFilters {
  search: string;
  state: string;
  fechaDesde: string;
  fechaHasta: string;
  tipoDte: string;
  page: number;
  pageSize: number;
}

interface FilterStore {
  invoices: InvoiceFilters;
  setInvoiceFilters: (f: Partial<InvoiceFilters>) => void;
  resetInvoiceFilters: () => void;
}

const defaultInvoiceFilters = (): InvoiceFilters => ({
  search: '',
  state: '',
  tipoDte: '',
  page: 1,
  pageSize: 25,
  ...defaultMonth(),
});

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      invoices: defaultInvoiceFilters(),
      setInvoiceFilters: (f) =>
        set((s) => ({ invoices: { ...s.invoices, ...f } })),
      resetInvoiceFilters: () =>
        set({ invoices: defaultInvoiceFilters() }),
    }),
    { name: 'peinau-filters' }
  )
);
