import { useState } from 'react';
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
  { value: 'en_nomina', label: 'En Nomina' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'rechazada', label: 'Rechazada' },
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
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('montoNeto', {
    header: 'Neto',
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
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvoiceListPage() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebouncedValue(search);
  const navigate = useNavigate();

  const { data, isLoading } = useInvoices({
    search: debouncedSearch || undefined,
    state: state || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    page,
    limit: pageSize,
  });

  const { table, selectedRows, rowSelection, setRowSelection } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.totalPages ?? 1,
    defaultPageSize: pageSize,
    enableRowSelection: true,
    manualPagination: true,
    onPaginationChange: (p) => {
      setPage(p.pageIndex + 1);
      setPageSize(p.pageSize);
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Facturas</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* State filter */}
            <Select
              value={state}
              onValueChange={(value) => {
                setState(value === '__all__' ? '' : value);
                setPage(1);
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

            {/* Date range */}
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="w-[160px]"
              placeholder="Desde"
            />
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="w-[160px]"
              placeholder="Hasta"
            />
          </div>
        </CardHeader>

        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
