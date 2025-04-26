'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { graphqlClient } from '@/lib/auth'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Добавляем типы для ответа GraphQL запроса
type SupplierResponse = {
  suppliers: {
    items: Supplier[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

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
        overallRating
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
`

const APPROVE_SUPPLIER = `
  mutation ApproveSupplier($id: ID!) {
    approveSupplier(id: $id) {
      id
      name
      status
    }
  }
`

const REJECT_SUPPLIER = `
  mutation RejectSupplier($id: ID!, $reason: String!) {
    rejectSupplier(id: $id, reason: $reason) {
      id
      name
      status
    }
  }
`

type Supplier = {
  id: string
  name: string
  email: string
  country: string
  status: string
  createdAt: string
  overallRating: number | null
  categories: { name: string }[]
}

export default function ManagerSuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchSuppliers = async (page = 1, search = '') => {
    setLoading(true)
    try {
      const filter: any = {}
      if (search) filter.search = search

      // Добавляем типизацию для ответа GraphQL запроса
      const data = await graphqlClient.request<SupplierResponse>(GET_SUPPLIERS, {
        pagination: { page, limit: 10 },
        filter,
      })

      setSuppliers(data.suppliers.items)
      setTotalPages(Math.ceil(data.suppliers.total / data.suppliers.limit))
      setTotalItems(data.suppliers.total)
      setCurrentPage(data.suppliers.page)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleSearch = () => {
    fetchSuppliers(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchSuppliers(page, searchTerm)
  }

  const handleApproveSupplier = async (id: string) => {
    try {
      await graphqlClient.request(APPROVE_SUPPLIER, { id })
      toast.success('Supplier approved successfully')
      // Update supplier in list
      setSuppliers(suppliers.map(s => (s.id === id ? { ...s, status: 'APPROVED' } : s)))
    } catch (error) {
      console.error('Error approving supplier:', error)
      toast.error('Failed to approve supplier')
    }
  }

  const handleRejectSupplier = async (id: string) => {
    // In a full implementation, this would show a dialog to enter a reason
    // For simplicity, we're using a hardcoded reason
    const reason = 'Does not meet our criteria'

    try {
      await graphqlClient.request(REJECT_SUPPLIER, { id, reason })
      toast.success('Supplier rejected')
      // Update supplier in list
      setSuppliers(suppliers.map(s => (s.id === id ? { ...s, status: 'REJECTED' } : s)))
    } catch (error) {
      console.error('Error rejecting supplier:', error)
      toast.error('Failed to reject supplier')
    }
  }

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
      header: 'Status',
      accessorKey: 'status',
      cell: (supplier: Supplier) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={supplier.status} />
          {supplier.status === 'PENDING' && (
            <div className="flex gap-1">
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleApproveSupplier(supplier.id)
                }}
                className="text-green-500 hover:text-green-700">
                <Icon icon="mdi:check" width={18} height={18} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleRejectSupplier(supplier.id)
                }}
                className="text-red-500 hover:text-red-700">
                <Icon icon="mdi:close" width={18} height={18} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Rating',
      accessorKey: 'overallRating',
      cell: (supplier: Supplier) => {
        if (!supplier.overallRating) return '-'
        return Array(5)
          .fill(0)
          .map((_, i) => (
            <Icon
              key={i}
              icon={i < supplier.overallRating! ? 'mdi:star' : 'mdi:star-outline'}
              className={i < supplier.overallRating! ? 'text-yellow-400' : 'text-gray-300'}
              width={16}
              height={16}
              inline={true}
            />
          ))
      },
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (supplier: Supplier) => format(new Date(supplier.createdAt), 'MMM d, yyyy'),
    },
  ]

  return (
    // Убираем проп role, который не ожидается компонентом DashboardLayout
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-gray-500">Review and manage supplier information</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Icon icon="mdi:magnify" className="absolute left-3 top-2.5 text-gray-500" width={20} height={20} />
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
        onRowClick={item => router.push(`/manager/suppliers/${item.id}`)}
      />

      {!loading && suppliers.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {suppliers.length} of {totalItems} suppliers
        </div>
      )}
    </DashboardLayout>
  )
}
