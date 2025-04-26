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
// Заменяем иконки из @iconify/react на lucide-react
import { Plus, Search } from 'lucide-react';

const GET_SUPPLIERS = `
  query GetSuppliers($pagination: PaginationInput, $filter: SupplierFilterInput) {
    suppliers(pagination: $pagination, filter: $filter) {
      items {
        id
        name
        email
        country
        status
        createdAt
        categories {
          name
        }
      }
      total
      page
      limit
      hasMore
    }
  }
`;

type Supplier = {
  id: string;
  name: string;
  email: string;
  country: string;
  status: string;
  createdAt: string;
  categories: { name: string }[];
};

// Тип для ответа GraphQL запроса
type GetSuppliersResponse = {
  suppliers: {
    items: Supplier[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchSuppliers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const filter: { search?: string } = {};
      if (search) filter.search = search;
      
      const response = await graphqlClient.request<GetSuppliersResponse>(GET_SUPPLIERS, {
        pagination: { page, limit: 10 },
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      if (response && response.suppliers) {
        setSuppliers(response.suppliers.items || []);
        setTotalPages(Math.ceil((response.suppliers.total || 0) / (response.suppliers.limit || 10)));
        setTotalItems(response.suppliers.total || 0);
        setCurrentPage(response.suppliers.page || 1);
      } else {
        setSuppliers([]);
        setTotalPages(1);
        setTotalItems(0);
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to load suppliers';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearch = () => {
    fetchSuppliers(1, searchTerm);
  };

  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    fetchSuppliers(page, searchTerm);
  };

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Country',
      accessorKey: 'country',
    },
    {
      header: 'Categories',
      accessorKey: 'categories',
      cell: (supplier: Supplier) => (
        <div className="flex flex-wrap gap-1">
          {supplier.categories.slice(0, 2).map((category, i) => (
            <span key={i} className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
              {category.name}
            </span>
          ))}
          {supplier.categories.length > 2 && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
              +{supplier.categories.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (supplier: Supplier) => <StatusBadge status={supplier.status} />,
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (supplier: Supplier) => format(new Date(supplier.createdAt), 'MMM d, yyyy'),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-gray-500">Manage supplier information and approvals</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700" 
          onClick={() => router.push('/admin/suppliers/create')}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Supplier
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search suppliers..."
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
        data={suppliers}
        loading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange,
        }}
        onRowClick={(item) => router.push(`/admin/suppliers/${item.id}`)}
      />

      {!loading && suppliers.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {suppliers.length} of {totalItems} suppliers
        </div>
      )}
    </DashboardLayout>
  );
}