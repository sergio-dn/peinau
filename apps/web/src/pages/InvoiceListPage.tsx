import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { useInvoices } from '@/api/invoices';
import { useDataTable } from '@/hooks/useDataTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { InvoiceStateBadge } from '@/components/invoices/InvoiceStateBadge';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { formatCLP } from '@wildlama/shared';
import { useFilterStore } from '@/stores/filter-store';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // Handle ISO date "YYYY-MM-DD" or datetime strings
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CL'); // DD/MM/YYYY
}
import { Search, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DTE_NAMES: Record<number, string> = {
  33: 'Factura',
  34: 'Fac. Exenta',
  43: 'Liq. Factura',
  46: 'Fac. Compra',
  56: 'Nota Débito',
  61: 'Nota Crédito',
};

function formatTipoDte(tipo: number): string {
  return DTE_NAMES[tipo] || `DTE ${tipo}`;
}

const STATES = [
  { value: '', label: 'Todos los estados' },
  { value: 'recibida', label: 'Recibida' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'contabilizada', label: 'Contabilizada' },
  { value: 'en_nomina', label: 'En Nómina' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'rechazada', label: 'Rechazada' },
];

const DTE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: '33', label: 'Factura (33)' },
  { value: '34', label: 'Fac. Exenta (34)' },
  { value: '46', label: 'Fac. Compra (46)' },
  { value: '61', label: 'Nota Crédito (61)' },
  { value: '56', label: 'Nota Débito (56)' },
];

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    size: 40,
  }),
  columnHelper.accessor('tipoDte', {
    header: 'Tipo',
    meta: { hiddenOnMobile: true },
    cell: (info) => (
      <span className="text-xs">{formatTipoDte(info.getValue())}</span>
    ),
    size: 100,
  }),
  columnHelper.accessor('folio', {
    header: 'Folio',
    cell: (info) => (
      <span className="font-medium text-primary">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('fechaEmision', {
    header: 'Fecha',
    enableSorting: true,
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('razonSocialEmisor', {
    header: 'Proveedor',
    enableSorting: true,
  }),
  columnHelper.accessor('rutEmisor', {
    header: 'RUT',
    meta: { hiddenOnMobile: true },
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('montoNeto', {
    header: 'Neto',
    meta: { hiddenOnMobile: true },
    cell: (info) => (
      <span className="text-right">{formatCLP(Number(info.getValue()))}</span>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor('montoTotal', {
    header: 'Total',
    cell: (info) => (
      <span className="font-medium">{formatCLP(Number(info.getValue()))}</span>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor('state', {
    header: 'Estado',
    cell: (info) => <InvoiceStateBadge state={info.getValue()} />,
  }),
  columnHelper.accessor('costCenterId', {
    header: 'CECO',
    cell: (info) =>
      info.getValue() ? (
        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          Imputada
        </span>
      ) : (
        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          Sin CECO
        </span>
      ),
    size: 100,
  }),
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvoiceListPage() {
  const { invoices: filters, setInvoiceFilters, resetInvoiceFilters } = useFilterStore();
  const debouncedSearch = useDebouncedValue(filters.search);

  const activeFilterCount = [
    filters.search,
    filters.state,
    filters.tipoDte,
    filters.fechaDesde,
    filters.fechaHasta,
  ].filter(Boolean).length;
  const navigate = useNavigate();

  const { data, isLoading } = useInvoices({
    search: debouncedSearch || undefined,
    state: filters.state || undefined,
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
    tipoDte: filters.tipoDte ? Number(filters.tipoDte) : undefined,
    page: filters.page,
    limit: filters.pageSize,
  });

  const { table, selectedRows, rowSelection, setRowSelection } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.totalPages ?? 1,
    defaultPageSize: filters.pageSize,
    enableRowSelection: true,
    manualPagination: true,
    onPaginationChange: (p) => {
      setInvoiceFilters({ page: p.pageIndex + 1, pageSize: p.pageSize });
    },
  });

  // Count invoices without CECO (sin costCenterId) from current page data
  const sinCecoCount = (data?.data ?? []).filter(
    (inv: any) => !inv.costCenterId
  ).length;

  // Pagination display
  const totalItems = data?.total ?? 0;
  const pageStart = totalItems === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const pageEnd = Math.min(filters.page * filters.pageSize, totalItems);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Facturas</h1>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
              {activeFilterCount}
            </span>
            filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}
            <button
              onClick={() => resetInvoiceFilters()}
              className="ml-1 hover:text-blue-900 transition-colors"
              aria-label="Limpiar filtros"
            >
              ×
            </button>
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor..."
                value={filters.search}
                onChange={(e) => {
                  setInvoiceFilters({ search: e.target.value, page: 1 });
                }}
                className="pl-10"
              />
            </div>

            {/* State filter */}
            <Select
              value={filters.state}
              onValueChange={(value) => {
                setInvoiceFilters({ state: value === '__all__' ? '' : value, page: 1 });
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s.value || '__all__'} value={s.value || '__all__'}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tipo DTE filter */}
            <Select
              value={filters.tipoDte}
              onValueChange={(value) => {
                setInvoiceFilters({ tipoDte: value === '__all__' ? '' : value, page: 1 });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                {DTE_OPTIONS.map((d) => (
                  <SelectItem key={d.value || '__all__'} value={d.value || '__all__'}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <Input
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => {
                setInvoiceFilters({ fechaDesde: e.target.value, page: 1 });
              }}
              className="w-[160px]"
              placeholder="Desde"
            />
            <Input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => {
                setInvoiceFilters({ fechaHasta: e.target.value, page: 1 });
              }}
              className="w-[160px]"
              placeholder="Hasta"
            />

            {/* Reset filters */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetInvoiceFilters()}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Banner facturas sin CECO */}
          {(data?.total ?? 0) > 0 && sinCecoCount > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2 mb-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => setInvoiceFilters({ state: 'recibida', page: 1 })}
            >
              <span className="text-amber-700 text-sm font-medium">
                ⚠ {sinCecoCount} facturas sin imputar en este período
              </span>
            </div>
          )}

          {/* Bulk actions toolbar */}
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-3 p-3 mb-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedRows.length} facturas seleccionadas
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Acciones <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Exportar CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
              >
                Limpiar seleccion
              </Button>
            </div>
          )}

          <DataTable
            table={table}
            onRowClick={(row: any) => navigate(`/invoices/${row.id}`)}
            isLoading={isLoading}
            totalItems={data?.total}
          />

          {/* Pagination info */}
          {totalItems > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Mostrando {pageStart}–{pageEnd} de {totalItems} facturas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
