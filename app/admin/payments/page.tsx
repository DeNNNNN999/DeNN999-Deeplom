'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { graphqlClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';

const GET_PAYMENTS = `
  query GetPayments($pagination: PaginationInput, $filter: PaymentFilterInput) {
    payments(pagination: $pagination, filter: $filter) {
      items {
        id
        amount
        currency
        invoiceNumber
        description
        status
        dueDate
        supplier {
          name
        }
        contract {
          title
        }
      }
      total
      page
      limit
      hasMore
    }
  }
`;

type Payment = {
  id: string;
  amount: number;
  currency: string;
  invoiceNumber: string | null;
  description: string | null;
  status: string;
  dueDate: string | null;
  supplier: {
    name: string;
  };
  contract: {
    title: string;
  } | null;
};

// Тип для ответа от GraphQL запроса
type GetPaymentsResponse = {
  payments: {
    items: Payment[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPayments = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const filter: { search?: string } = {};
      if (search) filter.search = search;

      const response = await graphqlClient.request<GetPaymentsResponse>(GET_PAYMENTS, {
        pagination: { page, limit: 10 },
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      if (response && response.payments) {
        setPayments(response.payments.items || []);
        setTotalPages(Math.ceil((response.payments.total || 0) / (response.payments.limit || 10)));
        setTotalItems(response.payments.total || 0);
        setCurrentPage(response.payments.page || 1);
      } else {
        setPayments([]);
        setTotalPages(1);
        setTotalItems(0);
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to load payments';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleSearch = () => {
    fetchPayments(1, searchTerm);
  };

  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    fetchPayments(page, searchTerm);
  };

  const columns = [
    {
      header: 'Invoice',
      accessorKey: 'invoiceNumber',
      cell: (payment: Payment) => payment.invoiceNumber || '-',
    },
    {
      header: 'Supplier',
      accessorKey: 'supplier.name',
      cell: (payment: Payment) => payment.supplier.name,
    },
    {
      header: 'Contract',
      accessorKey: 'contract.title',
      cell: (payment: Payment) => payment.contract?.title || '-',
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (payment: Payment) => `${payment.currency} ${payment.amount.toLocaleString()}`,
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: (payment: Payment) => payment.dueDate ? format(new Date(payment.dueDate), 'MMM d, yyyy') : '-',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (payment: Payment) => <StatusBadge status={payment.status} />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-500">Manage supplier payments and invoices</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push('/admin/payments/create')}
        >
          <Plus className="mr-2 h-5 w-5" />
          New Payment
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={handleKeyDownSearch}
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5"
            />
          </div>
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange,
        }}
        onRowClick={(item) => router.push(`/admin/payments/${item.id}`)}
      />

      {!loading && payments.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {payments.length} of {totalItems} payments
        </div>
      )}
    </DashboardLayout>
  );
}
