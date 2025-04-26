'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { graphqlClient } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { gql } from 'graphql-request'
// Заменяем импорт иконок с @iconify/react на lucide-react
import { Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

// GraphQL запрос
const GET_CONTRACTS = gql`
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

// Тип для контракта
type Contract = {
  id: string
  title: string
  contractNumber: string
  supplier: { name: string }
  status: string
  value: number
  currency: string
  startDate: string
  endDate: string
  daysRemaining: number | null
}

// Тип ответа GraphQL
type GetContractsResponse = {
  contracts: { items: Contract[]; total: number; page: number; limit: number; hasMore: boolean }
}

export default function ContractsPage() {
  const router = useRouter()
  const [contractsData, setContractsData] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchContracts = async (page = 1, search = '') => {
    setLoading(true)
    try {
      const filter: { search?: string } = {}
      if (search) filter.search = search
      const response = await graphqlClient.request<GetContractsResponse>(GET_CONTRACTS, {
        pagination: { page, limit: 10 },
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      })
      const contractsResult = response?.contracts
      if (contractsResult) {
        setContractsData(contractsResult.items || [])
        setTotalPages(Math.ceil((contractsResult.total || 0) / (contractsResult.limit || 10)))
        setTotalItems(contractsResult.total || 0)
        setCurrentPage(contractsResult.page || 1)
      } else {
        setContractsData([])
        setTotalPages(1)
        setTotalItems(0)
        setCurrentPage(1)
        throw new Error('Invalid response structure from API')
      }
    } catch (error: any) {
      console.error('Error fetching contracts:', error)
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to load contracts'
      toast.error(errorMessage)
      setContractsData([])
      setTotalPages(1)
      setTotalItems(0)
      setCurrentPage(1)
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
  
  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }
  
  const handlePageChange = (page: number) => {
    fetchContracts(page, searchTerm)
  }

  // Определяем колонки в формате, который ожидает DataTable
  const columns = [
    { 
      header: 'Contract Number', 
      accessorKey: 'contractNumber' 
    },
    { 
      header: 'Title', 
      accessorKey: 'title' 
    },
    {
      header: 'Supplier',
      accessorKey: 'supplier.name',
      cell: (item: Contract) => item.supplier?.name || 'N/A',
    },
    {
      header: 'Value',
      accessorKey: 'value',
      cell: (item: Contract) => `${item.currency} ${item.value?.toLocaleString() || '0'}`,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item: Contract) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Expires',
      accessorKey: 'endDate',
      cell: (item: Contract) => {
        try {
          return (
            <div className="flex items-center whitespace-nowrap">
              {format(new Date(item.endDate), 'MMM d, yyyy')}
              {item.daysRemaining !== null && item.status === 'ACTIVE' && (
                <span
                  className={`ml-2 text-xs font-medium ${
                    item.daysRemaining < 7
                      ? 'text-red-600 dark:text-red-500'
                      : item.daysRemaining < 30
                      ? 'text-yellow-600 dark:text-yellow-500'
                      : 'text-green-600 dark:text-green-500'
                  }`}>
                  ({item.daysRemaining} days)
                </span>
              )}
            </div>
          )
        } catch (e) {
          return 'Invalid Date'
        }
      },
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (item: Contract) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/admin/contracts/${item.id}`)
            }}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contracts</h1>
          <p className="text-muted-foreground">Manage supplier contracts and agreements</p>
        </div>
        <Button onClick={() => router.push('/admin/contracts/create')}>
          <Plus className="mr-1.5 h-5 w-5" />
          Add Contract
        </Button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full sm:w-auto">
          <Label htmlFor="search-contracts" className="sr-only">
            Search Contracts
          </Label>
          <div className="relative">
            <Input
              id="search-contracts"
              placeholder="Search by title, number, description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 input-base h-10"
              onKeyDown={handleKeyDownSearch}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <Button onClick={handleSearch} className="h-10 px-5">
          Search
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={contractsData}
        loading={loading}
        pagination={totalItems > 0 ? { currentPage, totalPages, onPageChange: handlePageChange } : undefined}
      />

      {/* Отображение информации о пагинации и кол-ве записей */}
      {!loading && totalItems > 0 && (
        <div className="mt-3 text-sm text-muted-foreground">
          Showing {contractsData.length} of {totalItems} contracts. Page {currentPage} of {totalPages}.
        </div>
      )}
      {!loading && totalItems === 0 && (
        <div className="mt-6 text-center text-muted-foreground">No contracts found matching your criteria.</div>
      )}
    </DashboardLayout>
  )
}
