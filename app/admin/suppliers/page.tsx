'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { graphqlClient } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { gsap } from 'gsap'
import { Plus, Search, RefreshCw, Filter, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
`

type Supplier = {
  id: string
  name: string
  email: string
  country: string
  status: string
  createdAt: string
  categories: { name: string }[]
}

// Тип для ответа GraphQL запроса
type GetSuppliersResponse = {
  suppliers: {
    items: Supplier[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

// Перевод статусов
const statusTranslations = {
  APPROVED: 'Утвержден',
  PENDING: 'Ожидает',
  REJECTED: 'Отклонен',
  INACTIVE: 'Неактивен',
}

// Перевод статусов для фильтра с ИСПРАВЛЕННЫМ значением "ALL" вместо пустой строки
const statusOptions = [
  { value: 'ALL', label: 'Все статусы' }, // Исправлено - используем "ALL" вместо ""
  { value: 'APPROVED', label: 'Утвержденные' },
  { value: 'PENDING', label: 'Ожидающие' },
  { value: 'REJECTED', label: 'Отклоненные' },
  { value: 'INACTIVE', label: 'Неактивные' },
]

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // Исправлено - начальное значение "ALL"
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Рефы для анимаций
  const tableRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const fetchSuppliers = async (page = 1, search = '', status = '') => {
    setLoading(true)

    // Анимация начала загрузки
    if (tableRef.current) {
      gsap.to(tableRef.current, {
        opacity: 0.7,
        duration: 0.3,
        ease: 'power2.inOut',
      })
    }

    try {
      const filter: { search?: string; status?: string } = {}
      if (search) filter.search = search
      if (status) filter.status = status

      const response = await graphqlClient.request<GetSuppliersResponse>(GET_SUPPLIERS, {
        pagination: { page, limit: 10 },
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      })

      if (response && response.suppliers) {
        setSuppliers(response.suppliers.items || [])
        setTotalPages(Math.ceil((response.suppliers.total || 0) / (response.suppliers.limit || 10)))
        setTotalItems(response.suppliers.total || 0)
        setCurrentPage(response.suppliers.page || 1)

        // Анимация успешной загрузки
        if (tableRef.current) {
          gsap.to(tableRef.current, {
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
          })

          // Анимация появления строк таблицы
          const rows = tableRef.current.querySelectorAll('tbody tr')
          gsap.fromTo(
            rows,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.05,
              duration: 0.4,
              ease: 'power2.out',
            },
          )
        }
      } else {
        setSuppliers([])
        setTotalPages(1)
        setTotalItems(0)
        throw new Error('Некорректная структура ответа')
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке поставщиков:', error)
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Не удалось загрузить поставщиков'
      toast.error(errorMessage)

      // Анимация ошибки
      if (tableRef.current) {
        gsap.to(tableRef.current, {
          x: [-5, 5, -5, 5, 0],
          duration: 0.4,
          ease: 'power2.inOut',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()

    // Анимация элементов при первой загрузке
    if (titleRef.current) {
      gsap.fromTo(titleRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
    }

    if (searchRef.current) {
      gsap.fromTo(
        searchRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' },
      )
    }
  }, [])

  const handleSearch = () => {
    // Анимация иконки поиска
    gsap.to('.search-icon', {
      rotate: 360,
      duration: 1,
      ease: 'elastic.out(1, 0.3)',
    })

    fetchSuppliers(1, searchTerm, statusFilter === 'ALL' ? '' : statusFilter) // Исправлено
  }

  // Исправлено - добавлена проверка на "ALL"
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    fetchSuppliers(1, searchTerm, value === 'ALL' ? '' : value)
  }

  const handleRefresh = () => {
    // Анимация иконки обновления
    gsap.to('.refresh-icon', {
      rotate: 360,
      duration: 0.8,
      ease: 'power1.inOut',
    })

    setSearchTerm('')
    setStatusFilter('ALL') // Исправлено - сбрасываем на "ALL"
    fetchSuppliers(1, '', '')
  }

  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePageChange = (page: number) => {
    // Плавный скролл вверх при смене страницы
    window.scrollTo({ top: 0, behavior: 'smooth' })
    fetchSuppliers(page, searchTerm, statusFilter === 'ALL' ? '' : statusFilter) // Исправлено
  }

  // Форматирование даты на русском языке
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy', { locale: ru })
  }

  const columns = [
    {
      header: 'Название',
      accessorKey: 'name',
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Страна',
      accessorKey: 'country',
    },
    {
      header: 'Категории',
      accessorKey: 'categories',
      cell: (supplier: Supplier) => (
        <div className="flex flex-wrap gap-1">
          {supplier.categories.slice(0, 2).map((category, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full
                                    bg-[#bd93f9]/10 px-2 py-0.5 text-xs text-[#bd93f9]
                                    border border-[#bd93f9]/20">
              {category.name}
            </span>
          ))}
          {supplier.categories.length > 2 && (
            <span
              className="inline-flex items-center rounded-full
                           bg-[#44475a]/50 px-2 py-0.5 text-xs text-[#8be9fd]">
              +{supplier.categories.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Статус',
      accessorKey: 'status',
      cell: (supplier: Supplier) => (
        <StatusBadge status={supplier.status} label={statusTranslations[supplier.status] || supplier.status} />
      ),
    },
    {
      header: 'Создан',
      accessorKey: 'createdAt',
      cell: (supplier: Supplier) => formatDate(supplier.createdAt),
    },
  ]

  return (
    <DashboardLayout>
      {/* Заголовок */}
      <div ref={titleRef} className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-transparent bg-clip-text
                        bg-gradient-to-r from-[#bd93f9] to-[#ff79c6]">
            Поставщики
          </h1>
          <p className="text-[#6272a4]">Управление информацией и утверждением поставщиков</p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="bg-gradient-to-r from-[#bd93f9] to-[#ff79c6] hover:opacity-90
                          border-none transition-all duration-300 sm:self-start"
                onClick={() => {
                  // Анимация нажатия кнопки
                  gsap.to('.add-button', {
                    scale: 0.95,
                    duration: 0.2,
                    onComplete: () => {
                      gsap.to('.add-button', {
                        scale: 1,
                        duration: 0.2,
                        onComplete: () => {
                          router.push('/admin/suppliers/create')
                        },
                      })
                    },
                  })
                }}>
                <Plus className="mr-2 h-5 w-5 add-button" />
                Добавить поставщика
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
              Создать нового поставщика
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Панель поиска и фильтрации */}
      <div ref={searchRef} className="mb-6 p-4 rounded-lg bg-[#282a36]/70 border border-[#44475a]/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#f8f8f2] mb-1.5">Поиск</label>
            <div className="relative">
              <Input
                placeholder="Поиск поставщиков..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                onKeyDown={handleKeyDownSearch}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6272a4] h-5 w-5 search-icon" />
            </div>
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-[#f8f8f2] mb-1.5">Статус</label>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger
                className="w-full bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                                      focus:ring-[#bd93f9] focus:border-[#bd93f9]">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="focus:bg-[#44475a]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Button onClick={handleSearch} className="bg-[#bd93f9] hover:bg-[#bd93f9]/80 text-white">
              <Search className="mr-2 h-4 w-4" />
              Поиск
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    className="border-[#44475a] bg-[#282a36] hover:bg-[#44475a] text-[#6272a4] hover:text-[#f8f8f2]">
                    <RefreshCw className="h-4 w-4 refresh-icon" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                  Сбросить фильтры
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Таблица данных */}
      <div
        ref={tableRef}
        className="
        bg-[#282a36]/50 border border-[#44475a]/50 rounded-lg p-4 backdrop-blur-sm
        transition-all duration-300 hover:shadow-lg hover:shadow-[#bd93f9]/5
      ">
        <DataTable
          columns={columns}
          data={suppliers}
          loading={loading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: handlePageChange,
          }}
          onRowClick={item => {
            // Анимация нажатия на строку
            gsap.to(`tr[data-id="${item.id}"]`, {
              backgroundColor: 'rgba(189, 147, 249, 0.1)',
              duration: 0.2,
              onComplete: () => {
                router.push(`/admin/suppliers/${item.id}`)
              },
            })
          }}
          noDataMessage="Поставщики не найдены"
          loadingMessage="Загрузка поставщиков..."
          tableClassName="bg-transparent"
          theadClassName="border-b border-[#44475a]"
          thClassName="text-[#8be9fd] font-medium"
          trClassName="border-b border-[#44475a]/30 hover:bg-[#44475a]/30 cursor-pointer
                    transition-colors duration-200"
          tdClassName="text-[#f8f8f2]"
          paginationClassName="text-[#6272a4]"
          paginationButtonClassName="bg-[#282a36] text-[#f8f8f2] border-[#44475a] hover:bg-[#44475a]"
          paginationActiveButtonClassName="bg-[#bd93f9] text-[#f8f8f2] border-[#bd93f9]"
        />

        {!loading && suppliers.length > 0 && (
          <div className="mt-3 text-sm text-[#6272a4]">
            Показано {suppliers.length} из {totalItems} поставщиков
          </div>
        )}
      </div>

      {/* Дополнительные стили для анимаций */}
      <style jsx global>{`
        /* Анимация наведения на строки таблицы */
        tr:hover td {
          color: #f8f8f2 !important;
        }

        /* Плавное появление подсказок */
        .tooltip-content {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Анимация для статуса */
        .status-badge {
          transition: all 0.3s ease;
        }

        .status-badge:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
      `}</style>
    </DashboardLayout>
  )
}
