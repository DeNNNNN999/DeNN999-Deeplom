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
type ContractResponse = {
  contracts: {
    items: Contract[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

const GET_CONTRACTS = `
  query GetContracts($pagination: PaginationInput, $filter: ContractFilterInput) {
    contracts(pagination: $pagination, filter: $filter) {
      items {
        id
        title
        contractNumber
        supplier {
          name
        }
        status
        value
        currency
        startDate
        endDate
        daysRemaining
      }
      total
      page
      limit
      hasMore
    }
  }
`

type Contract = {
  id: string
  title: string
  contractNumber: string
  supplier: {
    name: string
  }
  status: string
  value: number
  currency: string
  startDate: string
  endDate: string
  daysRemaining: number | null
}

export default function SpecialistContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchContracts = async (page = 1, search = '') => {
    setLoading(true)
    try {
      const filter: any = {}
      if (search) filter.search = search

      // Типизируем ответ GraphQL запроса
      const data = await graphqlClient.request<ContractResponse>(GET_CONTRACTS, {
        pagination: { page, limit: 10 },
        filter,
      })

      setContracts(data.contracts.items)
      setTotalPages(Math.ceil(data.contracts.total / data.contracts.limit))
      setTotalItems(data.contracts.total)
      setCurrentPage(data.contracts.page)
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast.error('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const handleSearch = () => {
    fetchContracts(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchContracts(page, searchTerm)
  }

  const columns = [
    {
      header: 'Contract Number',
      accessorKey: 'contractNumber',
    },
    {
      header: 'Title',
      accessorKey: 'title',
    },
    {
      header: 'Supplier',
      accessorKey: 'supplier.name',
      cell: (contract: Contract) => contract.supplier.name,
    },
    {
      header: 'Value',
      accessorKey: 'value',
      cell: (contract: Contract) => `${contract.currency} ${contract.value.toLocaleString()}`,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (contract: Contract) => <StatusBadge status={contract.status} />,
    },
    {
      header: 'Expires',
      accessorKey: 'endDate',
      cell: (contract: Contract) => (
        <div className="flex items-center">
          {format(new Date(contract.endDate), 'MMM d, yyyy')}
          {contract.daysRemaining !== null && contract.status === 'ACTIVE' && (
            <span
              className={`ml-2 text-xs ${
                contract.daysRemaining < 7
                  ? 'text-red-500'
                  : contract.daysRemaining < 30
                  ? 'text-yellow-500'
                  : 'text-green-500'
              }`}>
              ({contract.daysRemaining} days)
            </span>
          )}
        </div>
      ),
    },
  ]

  return (
    // Убираем проп role, который не ожидается компонентом DashboardLayout
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contracts</h1>
          <p className="text-gray-500">Manage supplier contracts and agreements</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/specialist/contracts/create')}>
          <Icon icon="mdi:plus" className="mr-2" width={20} height={20} />
          Add Contract
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search contracts..."
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
        data={contracts}
        loading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange,
        }}
        onRowClick={item => router.push(`/specialist/contracts/${item.id}`)}
      />

      {!loading && contracts.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {contracts.length} of {totalItems} contracts
        </div>
      )}
    </DashboardLayout>
  )
}
