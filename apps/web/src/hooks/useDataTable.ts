import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table';

interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pageCount?: number;
  defaultPageSize?: number;
  enableRowSelection?: boolean;
  manualPagination?: boolean;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export function useDataTable<TData>({
  data,
  columns,
  pageCount,
  defaultPageSize = 25,
  enableRowSelection = false,
  manualPagination = true,
  onPaginationChange,
}: UseDataTableOptions<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      setPagination((old) => {
        const newPagination = typeof updater === 'function' ? updater(old) : updater;
        onPaginationChange?.(newPagination);
        return newPagination;
      });
    },
    [onPaginationChange]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection,
    manualPagination,
  });

  const selectedRows = useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows.map((row) => row.original),
    [table, rowSelection]
  );

  return {
    table,
    sorting,
    pagination,
    selectedRows,
    rowSelection,
    setRowSelection,
  };
}
