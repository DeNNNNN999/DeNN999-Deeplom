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

// Добавляем тип ответа GraphQL запроса
type PaymentsResponse = {
  payments: {
    items: Payment[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

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
`

type Payment = {
  id: string
  amount: number
  currency: string
  invoiceNumber: string | null
  description: string | null
  status: string
  dueDate: string | null
  supplier: {
    name: string
  }
  contract: {
    title: string
  } | null
}

export default function SpecialistPaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchPayments = async (page = 1, search = '') => {
    setLoading(true)
    try {
      const filter: any = {}
      if (search) filter.search = search

      // Добавляем типизацию для ответа GraphQL запроса
      const data = await graphqlClient.request<PaymentsResponse>(GET_PAYMENTS, {
        pagination: { page, limit: 10 },
        filter,
      })

      setPayments(data.payments.items)
      setTotalPages(Math.ceil(data.payments.total / data.payments.limit))
      setTotalItems(data.payments.total)
      setCurrentPage(data.payments.page)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleSearch = () => {
    fetchPayments(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchPayments(page, searchTerm)
  }

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
      cell: (payment: Payment) => (payment.dueDate ? format(new Date(payment.dueDate), 'MMM d, yyyy') : '-'),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (payment: Payment) => <StatusBadge status={payment.status} />,
    },
  ]

  return (
    // Убираем проп role, который не ожидается компонентом DashboardLayout
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-500">Manage supplier payments and invoices</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/specialist/payments/create')}>
          <Icon icon="mdi:plus" className="mr-2" width={20} height={20} />
          New Payment
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search payments..."
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
        data={payments}
        loading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange,
        }}
        onRowClick={item => router.push(`/specialist/payments/${item.id}`)}
      />

      {!loading && payments.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {payments.length} of {totalItems} payments
        </div>
      )}
    </DashboardLayout>
  )
}
