'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, FilterIcon, PlusCircle, Trash2, Pencil, MoreHorizontal, FileText, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { gql } from 'graphql-request'
import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'

// Типы данных
type ContractStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

interface Contract {
  id: string
  title: string
  supplier: {
    id: string
    name: string
  }
  contractNumber: string
  startDate: string
  endDate: string
  value: number
  currency: string
  status: ContractStatus
  createdAt: string
  daysRemaining?: number
}

interface ContractsResponse {
  items: Contract[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Запрос для получения контрактов
const GET_CONTRACTS = gql`
  query GetContracts(
    $page: Int!
    $limit: Int!
    $search: String
    $status: ContractStatus
    $startDateFrom: DateTime
    $startDateTo: DateTime
    $endDateFrom: DateTime
    $endDateTo: DateTime
    $minValue: Int
    $maxValue: Int
    $supplierId: ID
  ) {
    contracts(
      pagination: { page: $page, limit: $limit }
      filter: {
        search: $search
        status: $status
        startDateFrom: $startDateFrom
        startDateTo: $startDateTo
        endDateFrom: $endDateFrom
        endDateTo: $endDateTo
        minValue: $minValue
        maxValue: $maxValue
        supplierId: $supplierId
      }
    ) {
      items {
        id
        title
        contractNumber
        startDate
        endDate
        value
        currency
        status
        createdAt
        daysRemaining
        supplier {
          id
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

// Мутация для удаления контракта
const DELETE_CONTRACT = gql`
  mutation DeleteContract($id: ID!) {
    deleteContract(id: $id)
  }
`

// Перевод статусов контрактов
const contractStatusTranslation = {
  DRAFT: 'Черновик',
  PENDING_APPROVAL: 'Ожидает утверждения',
  APPROVED: 'Утвержден',
  ACTIVE: 'Активен',
  EXPIRED: 'Истек',
  TERMINATED: 'Расторгнут',
}

// Стили для статусов
const contractStatusStyles = {
  DRAFT: 'bg-gray-200 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  TERMINATED: 'bg-purple-100 text-purple-800',
}

export default function ContractsPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Состояния фильтров
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ContractStatus | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [startDateFrom, setStartDateFrom] = useState<Date | null>(null)
  const [startDateTo, setStartDateTo] = useState<Date | null>(null)
  const [endDateFrom, setEndDateFrom] = useState<Date | null>(null)
  const [endDateTo, setEndDateTo] = useState<Date | null>(null)
  const [minValue, setMinValue] = useState<number | ''>('')
  const [maxValue, setMaxValue] = useState<number | ''>('')
  const [filtersVisible, setFiltersVisible] = useState(false)

  // Загрузка контрактов с расширенной обработкой ошибок
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contracts', page, limit, search, status, startDateFrom, startDateTo, endDateFrom, endDateTo, minValue, maxValue],
    queryFn: async () => {
      try {
        // Попытка загрузки данных через GraphQL API
        const variables = {
          page,
          limit,
          search: search || undefined,
          status: status || undefined,
          startDateFrom: startDateFrom ? format(startDateFrom, 'yyyy-MM-dd') : undefined,
          startDateTo: startDateTo ? format(startDateTo, 'yyyy-MM-dd') : undefined,
          endDateFrom: endDateFrom ? format(endDateFrom, 'yyyy-MM-dd') : undefined, 
          endDateTo: endDateTo ? format(endDateTo, 'yyyy-MM-dd') : undefined,
          minValue: typeof minValue === 'number' ? minValue : undefined,
          maxValue: typeof maxValue === 'number' ? maxValue : undefined,
        };
        
        console.log('Request variables:', variables); // Логируем передаваемые параметры
        
        const response = await graphqlClient.request<{ contracts: ContractsResponse }>(GET_CONTRACTS, variables)
        
        // Проверка на наличие данных
        if (!response || !response.contracts) {
          // Временно для отладки вернем пустой результат, чтобы приложение не падало
          console.error('API returned invalid data structure:', response)
          
          // Показываем уведомление
          toast({
            title: 'Ошибка формата данных',
            description: 'Сервер вернул некорректный формат данных. Пожалуйста, обратитесь к администратору.',
            variant: 'destructive',
          })
          
          // Возвращаем пустой результат
          return {
            items: [],
            total: 0,
            page: 1,
            limit: 10,
            hasMore: false,
          }
        }
        
        return response.contracts
      } catch (error: any) {
        console.error('Error fetching contracts:', error)
        
        // Показываем ошибку пользователю
        toast({
          title: 'Ошибка загрузки данных',
          description: error.message || 'Не удалось загрузить список контрактов. Пожалуйста, попробуйте еще раз.',
          variant: 'destructive',
        })
        
        // Временно для отладки вернем пустой результат, чтобы приложение не падало
        return {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          hasMore: false,
        }
      }
    },
    retry: 3,            // Увеличиваем количество попыток
    retryDelay: 1000,     // Задержка между попытками (1 секунда)
  })

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setSearch('')
    setStatus(null)
    setStartDateFrom(null)
    setStartDateTo(null)
    setEndDateFrom(null)
    setEndDateTo(null)
    setMinValue('')
    setMaxValue('')
    setPage(1)
  }

  // Обработчик обновления списка
  const handleRefresh = () => {
    refetch()
  }

  // Обработчик удаления контракта
  const handleDeleteContract = async (id: string) => {
    try {
      await graphqlClient.request(DELETE_CONTRACT, { id })
      toast({
        title: 'Контракт удален',
        description: 'Контракт был успешно удален из системы',
      })
      refetch()
    } catch (error: any) {
      toast({
        title: 'Ошибка при удалении',
        description: error.message || 'Не удалось удалить контракт',
        variant: 'destructive',
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Управление контрактами</h1>
          <p className="text-gray-500">Просмотр и управление контрактами с поставщиками</p>
        </div>
        <Button
          onClick={() => router.push('/admin/contracts/create')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Создать контракт
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Input
                placeholder="Поиск по названию, номеру..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select
                value={status || undefined}
                onValueChange={(value) => {
                  // Если выбрано 'all', устанавливаем null вместо 'all'
                  setStatus(value === 'all' ? null : value as ContractStatus)
                }}
              >
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="DRAFT">Черновик</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Ожидает утверждения</SelectItem>
                  <SelectItem value="APPROVED">Утвержден</SelectItem>
                  <SelectItem value="ACTIVE">Активен</SelectItem>
                  <SelectItem value="EXPIRED">Истек</SelectItem>
                  <SelectItem value="TERMINATED">Расторгнут</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex">
              <Button
                variant="outline"
                className="mr-2"
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 refresh-icon" />
              </Button>
            </div>
          </div>

          {filtersVisible && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Дата начала (от)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateFrom ? (
                        format(startDateFrom, 'dd.MM.yyyy', { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDateFrom}
                      onSelect={setStartDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Дата начала (до)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateTo ? (
                        format(startDateTo, 'dd.MM.yyyy', { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDateTo}
                      onSelect={setStartDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Дата окончания (от)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDateFrom ? (
                        format(endDateFrom, 'dd.MM.yyyy', { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDateFrom}
                      onSelect={setEndDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Дата окончания (до)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDateTo ? (
                        format(endDateTo, 'dd.MM.yyyy', { locale: ru })
                      ) : (
                        <span>Выберите дату</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDateTo}
                      onSelect={setEndDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Стоимость (от)</label>
                <Input
                  type="number"
                  placeholder="Мин. сумма"
                  value={minValue === '' ? '' : minValue}
                  onChange={(e) => setMinValue(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Стоимость (до)</label>
                <Input
                  type="number"
                  placeholder="Макс. сумма"
                  value={maxValue === '' ? '' : maxValue}
                  onChange={(e) => setMaxValue(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mb-0.5"
                >
                  Сбросить фильтры
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="contracts-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Название</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Номер контракта</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Стоимость</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дней осталось</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-4 text-red-500">
                      Ошибка при загрузке данных. Пожалуйста, попробуйте еще раз.
                    </TableCell>
                  </TableRow>
                ) : data?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-4">
                      Контракты не найдены. Измените параметры поиска или создайте новый контракт.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((contract) => (
                    <TableRow key={contract.id} className="contract-row">
                      <TableCell className="font-medium">
                        <Link href={`/admin/contracts/${contract.id}`} className="hover:text-blue-600 hover:underline">
                          {contract.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/suppliers/${contract.supplier.id}`} className="hover:text-blue-600 hover:underline">
                          {contract.supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell>{contract.contractNumber}</TableCell>
                      <TableCell>
                        {format(new Date(contract.startDate), 'dd.MM.yyyy', { locale: ru })} - {format(new Date(contract.endDate), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        {contract.value.toLocaleString('ru-RU')} {contract.currency}
                      </TableCell>
                      <TableCell>
                        <Badge className={contractStatusStyles[contract.status]}>
                          {contractStatusTranslation[contract.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contract.daysRemaining !== undefined ? (
                          contract.daysRemaining < 0 ? (
                            <span className="text-red-500">Истек</span>
                          ) : contract.daysRemaining < 30 ? (
                            <span className="text-amber-500">{contract.daysRemaining}</span>
                          ) : (
                            <span>{contract.daysRemaining}</span>
                          )
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Открыть меню</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/contracts/${contract.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Просмотр
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/contracts/${contract.id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (confirm('Вы уверены, что хотите удалить этот контракт? Это действие нельзя отменить.')) {
                                  handleDeleteContract(contract.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.total > 0 && (
            <div className="py-4 px-2">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Показано {data.items.length} из {data.total} контрактов
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, Math.ceil(data.total / limit)) }).map((_, i) => {
                      const pageNumber = i + 1
                      const isCurrentPage = pageNumber === page

                      return (
                        <PaginationItem key={i}>
                          <Button
                            variant={isCurrentPage ? "default" : "outline"}
                            className={`h-9 w-9 ${isCurrentPage ? 'bg-blue-600' : ''}`}
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        </PaginationItem>
                      )
                    })}

                    {Math.ceil(data.total / limit) > 5 && (
                      <PaginationItem>
                        <div className="px-2">...</div>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => p + 1)}
                        disabled={!data.hasMore}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Строк на странице:</span>
                  <Select value={limit.toString()} onValueChange={(value) => {
                    setLimit(Number(value))
                    setPage(1)
                  }}>
                    <SelectTrigger className="w-16">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
