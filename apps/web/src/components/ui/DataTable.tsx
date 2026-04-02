import {
  flexRender,
  type Table as TanStackTable,
  type Header,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  skeletonRows?: number;
  totalItems?: number;
}

function SortIcon<TData>({ header }: { header: Header<TData, unknown> }) {
  const sorted = header.column.getIsSorted();
  if (sorted === 'asc') return <ArrowUp className="ml-1 h-4 w-4" />;
  if (sorted === 'desc') return <ArrowDown className="ml-1 h-4 w-4" />;
  return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
}

export function DataTable<TData>({
  table,
  onRowClick,
  isLoading = false,
  skeletonRows = 10,
  totalItems,
}: DataTableProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const visibleColumns = table.getVisibleFlatColumns();

  const from = totalItems ? pageIndex * pageSize + 1 : 0;
  const to = totalItems ? Math.min((pageIndex + 1) * pageSize, totalItems) : 0;

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-slate-50/80">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'h-11 px-3 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                        canSort && 'cursor-pointer select-none'
                      )}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon header={header} />}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="border-b">
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="h-12 px-3">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.length > 0
                ? table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border/50 transition-colors duration-100 hover:bg-slate-50/80',
                        row.getIsSelected() && 'bg-muted',
                        onRowClick && 'cursor-pointer'
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isCheckboxColumn =
                          cell.column.id === 'select' || cell.column.id === 'checkbox';
                        return (
                          <td
                            key={cell.id}
                            className="py-3 px-3 align-middle"
                            onClick={
                              isCheckboxColumn && onRowClick
                                ? (e) => e.stopPropagation()
                                : undefined
                            }
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                : (
                    <tr>
                      <td
                        colSpan={visibleColumns.length}
                        className="h-32 text-center text-muted-foreground"
                      >
                        Sin resultados.
                      </td>
                    </tr>
                  )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems != null && totalItems > 0 && (
        <div className="flex items-center justify-between border-t pt-4 mt-2 px-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Mostrando {from}-{to} de {totalItems}
            </span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground"
              value={pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} por página
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
