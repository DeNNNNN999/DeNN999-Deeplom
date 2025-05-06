'use client'

import { useState, useEffect, useRef } from 'react'
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
import { ru } from 'date-fns/locale'
import gsap from 'gsap'

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
  
  // Refs для GSAP анимаций
  const tableRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

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

  // Инициализация данных и анимаций
  useEffect(() => {
    fetchSuppliers()

    // Анимация при загрузке страницы
    const timeline = gsap.timeline()

    // Анимация заголовка
    if (titleRef.current) {
      timeline.from(titleRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.5,
        ease: 'power1.out'
      })
    }

    // Анимация подзаголовка
    if (subtitleRef.current) {
      timeline.from(subtitleRef.current, {
        y: -10,
        opacity: 0,
        duration: 0.5,
        ease: 'power1.out'
      }, '-=0.3')
    }

    // Анимация поиска
    if (searchRef.current) {
      timeline.from(searchRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out'
      }, '-=0.3')
    }

    // Анимация таблицы
    if (tableRef.current) {
      timeline.from(tableRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, '-=0.2')
    }
  }, [])

  const handleSearch = () => {
    fetchSuppliers(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchSuppliers(page, searchTerm)
  }

  // Анимация для строк таблицы
  const animateRow = (id: string, type: 'approve' | 'reject') => {
    const row = document.querySelector(`[data-row-id="${id}"]`);
    if (row) {
      // При одобрении - зеленая вспышка, при отклонении - красная
      const color = type === 'approve' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      const originalColor = 'transparent';
      
      gsap.fromTo(row, 
        { backgroundColor: color },
        { backgroundColor: originalColor, duration: 1.5, ease: 'power2.out' }
      );
    }
  };

  const handleApproveSupplier = async (id: string) => {
    try {
      await graphqlClient.request(APPROVE_SUPPLIER, { id })
      
      // Анимируем строку
      animateRow(id, 'approve');
      
      // Обновляем список поставщиков
      setSuppliers(suppliers.map(s => (s.id === id ? { ...s, status: 'APPROVED' } : s)))
      
      // Уведомляем пользователя
      toast.success('Поставщик успешно одобрен', {
        position: 'top-center',
        duration: 3000,
        icon: <Icon icon="mdi:check-circle" className="text-green-500" width={24} height={24} />
      })
    } catch (error) {
      console.error('Error approving supplier:', error)
      toast.error('Не удалось одобрить поставщика. Попробуйте еще раз', {
        position: 'top-center',
        duration: 5000,
        icon: <Icon icon="mdi:alert-circle" className="text-red-500" width={24} height={24} />
      })
    }
  }

  const handleRejectSupplier = async (id: string) => {
    // В полной реализации здесь был бы диалог для ввода причины
    // Для простоты используем стандартную причину
    const reason = 'Не соответствует нашим критериям'

    try {
      await graphqlClient.request(REJECT_SUPPLIER, { id, reason })
      
      // Анимируем строку
      animateRow(id, 'reject');
      
      // Обновляем список поставщиков
      setSuppliers(suppliers.map(s => (s.id === id ? { ...s, status: 'REJECTED' } : s)))
      
      // Уведомляем пользователя
      toast.success('Поставщик отклонен', {
        position: 'top-center', 
        duration: 3000,
        icon: <Icon icon="mdi:close-circle" className="text-red-500" width={24} height={24} />
      })
    } catch (error) {
      console.error('Error rejecting supplier:', error)
      toast.error('Не удалось отклонить поставщика. Попробуйте еще раз', {
        position: 'top-center',
        duration: 5000,
        icon: <Icon icon="mdi:alert-circle" className="text-red-500" width={24} height={24} />
      })
    }
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
      cell: (supplier: Supplier) => {
        // Переводим название стран на русский, если нужно
        const countryTranslations: Record<string, string> = {
          'Russia': 'Россия',
          'USA': 'США',
          'China': 'Китай',
          'Germany': 'Германия',
          'France': 'Франция',
          'UK': 'Великобритания',
          // добавьте другие страны по необходимости
        };
        return countryTranslations[supplier.country] || supplier.country;
      },
    },
    {
      header: 'Статус',
      accessorKey: 'status',
      cell: (supplier: Supplier) => {
        // Переводим статусы на русский
        const statusMap: Record<string, string> = {
          'PENDING': 'Ожидает',
          'APPROVED': 'Одобрен',
          'REJECTED': 'Отклонен',
          'INACTIVE': 'Неактивен'
        };
        
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={supplier.status}>
              {statusMap[supplier.status] || supplier.status}
            </StatusBadge>
            {supplier.status === 'PENDING' && (
              <div className="flex gap-1">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleApproveSupplier(supplier.id)
                  }}
                  className="text-green-500 hover:text-green-700 transition-all duration-200 hover:scale-110"
                  title="Одобрить">
                  <Icon icon="mdi:check" width={20} height={20} />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleRejectSupplier(supplier.id)
                  }}
                  className="text-red-500 hover:text-red-700 transition-all duration-200 hover:scale-110"
                  title="Отклонить">
                  <Icon icon="mdi:close" width={20} height={20} />
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Рейтинг',
      accessorKey: 'overallRating',
      cell: (supplier: Supplier) => {
        if (!supplier.overallRating) return '-';
        return (
          <div className="flex items-center">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Icon
                  key={i}
                  icon={i < supplier.overallRating! ? 'mdi:star' : 'mdi:star-outline'}
                  className={i < supplier.overallRating! ? 'text-yellow-400' : 'text-gray-300'}
                  width={18}
                  height={18}
                  inline={true}
                />
              ))}
            <span className="ml-1 text-sm text-gray-600">({supplier.overallRating})</span>
          </div>
        );
      },
    },
    {
      header: 'Дата создания',
      accessorKey: 'createdAt',
      cell: (supplier: Supplier) => format(new Date(supplier.createdAt), 'd MMMM yyyy', { locale: ru }),
    },
  ]

  return (
    <DashboardLayout>
      {/* Заголовок и описание */}
      <div className="mb-8 flex items-center justify-between bg-gradient-to-r from-blue-900/10 to-indigo-900/10 p-6 rounded-lg shadow-sm">
        <div>
          <h1 ref={titleRef} className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">Поставщики</h1>
          <p ref={subtitleRef} className="text-gray-600 dark:text-gray-300">Просмотр и управление информацией о поставщиках</p>
        </div>
      </div>

      {/* Поиск */}
      <div ref={searchRef} className="mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Поиск поставщиков..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900 rounded-lg shadow-sm"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Icon 
              icon="mdi:magnify" 
              className="absolute left-3 top-2.5 text-blue-500" 
              width={20} 
              height={20} 
            />
          </div>
        </div>
        <Button 
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 transition-all duration-200">
          Поиск
        </Button>
      </div>

      {/* Таблица поставщиков */}
      <div ref={tableRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
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
          rowProps={(row) => ({
            'data-row-id': row.id,
            className: 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150'
          })}
          emptyMessage="Поставщики не найдены"
          loadingMessage="Загрузка поставщиков..."
        />

        {!loading && suppliers.length > 0 && (
          <div className="p-4 text-sm text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            Показано {suppliers.length} из {totalItems} поставщиков
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
