'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { useState } from 'react';

interface DataTableProps<T> {
  columns: {
    header: string;
    accessorKey: string;
    cell?: (item: T) => React.ReactNode;
  }[];
  data: T[];
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  pagination,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="rounded-md border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.accessorKey}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, i) => (
                <TableRow
                  key={i}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey}>
                      {column.cell
                        ? column.cell(item)
                        : (item as any)[column.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end p-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              <Icon icon="mdi:chevron-left" width={18} height={18} />
            </Button>
            
            <span className="text-sm text-gray-500">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              <Icon icon="mdi:chevron-right" width={18} height={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}