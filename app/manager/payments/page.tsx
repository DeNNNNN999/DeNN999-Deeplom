'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { graphqlClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Eye,
  DollarSign
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  APPROVE_PAYMENT_MUTATION,
  REJECT_PAYMENT_MUTATION
} from '@/lib/graphql/mutations';

// Типы для данных платежа
type Supplier = {
  id: string;
  name: string;
};

type Contract = {
  id: string;
  title: string;
  contractNumber: string;
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  invoiceNumber: string | null;
  description: string | null;
  status: string;
  dueDate: string | null;
  paymentDate: string | null;
  invoiceDate: string | null;
  supplier: Supplier;
  contract: Contract | null;
  createdAt: string;
  updatedAt: string;
};

// Типы для ответа от GraphQL запроса
type GetPaymentsResponse = {
  payments: {
    items: Payment[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

// GraphQL запрос для получения платежей
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
        paymentDate
        invoiceDate
        supplier {
          id
          name
        }
        contract {
          id
          title
          contractNumber
        }
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export default function ManagerPaymentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  
  // Состояния для платежей
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFromFilter, setDateFromFilter] = useState<Date | null>(null);
  const [dateToFilter, setDateToFilter] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Состояния для сводки платежей
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  
  // Состояния для модальных окон
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Загрузка платежей при изменении фильтров
  useEffect(() => {
    const status = activeTab === 'pending' ? 'PENDING' : 
                  activeTab === 'approved' ? 'APPROVED' : 
                  activeTab === 'rejected' ? 'REJECTED' : statusFilter;
    
    fetchPayments(currentPage, searchTerm, status, dateFromFilter, dateToFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab]);

  // Загрузка платежей с применением фильтров
  const fetchPayments = async (page = 1, search = '', status: string | null = null, dateFrom: Date | null = null, dateTo: Date | null = null) => {
    setLoading(true);
    try {
      const filter: Record<string, any> = {};
      
      if (search) filter.search = search;
      if (status) filter.status = status;
      
      if (dateFrom) filter.dateFrom = dateFrom.toISOString();
      if (dateTo) filter.dateTo = dateTo.toISOString();
      
      const response = await graphqlClient.request<GetPaymentsResponse>(GET_PAYMENTS, {
        pagination: { page, limit: 10 },
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      if (response && response.payments) {
        setPayments(response.payments.items || []);
        setTotalPages(Math.ceil((response.payments.total || 0) / 10));
        setTotalItems(response.payments.total || 0);
        setCurrentPage(response.payments.page || 1);
        
        // Обновляем сводную информацию
        updatePaymentsSummary(response.payments.items);
      } else {
        setPayments([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке платежей:', error);
      toast.error('Не удалось загрузить платежи');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Обновление сводной информации о платежах
  const updatePaymentsSummary = (payments: Payment[]) => {
    // Если мы на вкладке с фильтрацией, запрашиваем общую информацию
    if (activeTab !== 'all' || statusFilter) {
      calculatePaymentsSummary();
    } else {
      // Иначе считаем на основе текущих данных
      const pending = payments.filter(p => p.status === 'PENDING').length;
      const approved = payments.filter(p => p.status === 'APPROVED').length;
      const rejected = payments.filter(p => p.status === 'REJECTED').length;
      
      const pendingAmountSum = payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0);
      
      setPendingCount(pending);
      setApprovedCount(approved);
      setRejectedCount(rejected);
      setPendingAmount(pendingAmountSum);
    }
  };
  
  // Расчет сводной информации о платежах (отдельный запрос)
  const calculatePaymentsSummary = async () => {
    try {
      // Запрос для получения числа платежей по каждому статусу
      const pendingResponse = await graphqlClient.request<GetPaymentsResponse>(GET_PAYMENTS, {
        pagination: { page: 1, limit: 1 },
        filter: { status: 'PENDING' }
      });
      
      const approvedResponse = await graphqlClient.request<GetPaymentsResponse>(GET_PAYMENTS, {
        pagination: { page: 1, limit: 1 },
        filter: { status: 'APPROVED' }
      });
      
      const rejectedResponse = await graphqlClient.request<GetPaymentsResponse>(GET_PAYMENTS, {
        pagination: { page: 1, limit: 1 },
        filter: { status: 'REJECTED' }
      });
      
      // Получение суммы ожидающих платежей
      const pendingAmountResponse = await graphqlClient.request<GetPaymentsResponse>(GET_PAYMENTS, {
        pagination: { page: 1, limit: 100 },
        filter: { status: 'PENDING' }
      });
      
      setPendingCount(pendingResponse.payments.total || 0);
      setApprovedCount(approvedResponse.payments.total || 0);
      setRejectedCount(rejectedResponse.payments.total || 0);
      
      const pendingAmountSum = pendingAmountResponse.payments.items
        .reduce((sum, p) => sum + p.amount, 0);
      
      setPendingAmount(pendingAmountSum);
    } catch (error) {
      console.error('Ошибка при получении сводной информации о платежах:', error);
    }
  };

  // Обработка поиска
  const handleSearch = () => {
    setCurrentPage(1);
    const status = activeTab === 'pending' ? 'PENDING' : 
                 activeTab === 'approved' ? 'APPROVED' : 
                 activeTab === 'rejected' ? 'REJECTED' : statusFilter;
    
    fetchPayments(1, searchTerm, status, dateFromFilter, dateToFilter);
  };
  
  // Обработка нажатия Enter в поле поиска
  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Обработка сброса фильтров
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter(null);
    setDateFromFilter(null);
    setDateToFilter(null);
    setCurrentPage(1);
    fetchPayments(1);
  };
  
  // Обработка смены страницы
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Обработка смены вкладки
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };
  
  // Утверждение платежа
  const handleApprovePayment = async (paymentId: string) => {
    setIsApproving(true);
    try {
      await graphqlClient.request(APPROVE_PAYMENT_MUTATION, { id: paymentId });
      toast.success('Платеж успешно утвержден');
      
      // Обновляем данные
      const status = activeTab === 'pending' ? 'PENDING' : 
                  activeTab === 'approved' ? 'APPROVED' : 
                  activeTab === 'rejected' ? 'REJECTED' : statusFilter;
      
      fetchPayments(currentPage, searchTerm, status, dateFromFilter, dateToFilter);
    } catch (error: any) {
      console.error('Ошибка при утверждении платежа:', error);
      toast.error('Не удалось утвердить платеж');
    } finally {
      setIsApproving(false);
    }
  };
  
  // Открытие диалога отклонения платежа
  const openRejectDialog = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };
  
  // Отклонение платежа
  const handleRejectPayment = async () => {
    if (!selectedPaymentId) return;
    
    setIsRejecting(true);
    try {
      await graphqlClient.request(REJECT_PAYMENT_MUTATION, {
        id: selectedPaymentId,
        reason: rejectReason
      });
      
      toast.success('Платеж отклонен');
      setIsRejectDialogOpen(false);
      
      // Обновляем данные
      const status = activeTab === 'pending' ? 'PENDING' : 
                  activeTab === 'approved' ? 'APPROVED' : 
                  activeTab === 'rejected' ? 'REJECTED' : statusFilter;
      
      fetchPayments(currentPage, searchTerm, status, dateFromFilter, dateToFilter);
    } catch (error: any) {
      console.error('Ошибка при отклонении платежа:', error);
      toast.error('Не удалось отклонить платеж');
    } finally {
      setIsRejecting(false);
    }
  };

  // Форматирование даты для отображения
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: ru });
  };
  
  // Получение перевода статуса на русский язык
  const getStatusTranslation = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'На рассмотрении';
      case 'APPROVED':
        return 'Утвержден';
      case 'PAID':
        return 'Оплачен';
      case 'REJECTED':
        return 'Отклонен';
      default:
        return status;
    }
  };

  // Колонки для таблицы платежей
  const paymentsColumns = [
    {
      header: 'Номер счета',
      accessorKey: 'invoiceNumber',
      cell: (payment: Payment) => (
        <div className="font-medium">{payment.invoiceNumber || '-'}</div>
      ),
    },
    {
      header: 'Поставщик',
      accessorKey: 'supplier.name',
      cell: (payment: Payment) => payment.supplier.name,
    },
    {
      header: 'Контракт',
      accessorKey: 'contract.title',
      cell: (payment: Payment) => payment.contract?.title || '-',
    },
    {
      header: 'Сумма',
      accessorKey: 'amount',
      cell: (payment: Payment) => (
        <div className="font-medium">
          {payment.currency} {payment.amount.toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Дата счета',
      accessorKey: 'invoiceDate',
      cell: (payment: Payment) => formatDate(payment.invoiceDate),
    },
    {
      header: 'Срок оплаты',
      accessorKey: 'dueDate',
      cell: (payment: Payment) => formatDate(payment.dueDate),
    },
    {
      header: 'Статус',
      accessorKey: 'status',
      cell: (payment: Payment) => <StatusBadge status={payment.status} />,
    },
    {
      header: 'Действия',
      accessorKey: 'id',
      cell: (payment: Payment) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/manager/payments/${payment.id}`);
            }}
            title="Просмотреть детали"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {payment.status === 'PENDING' && (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprovePayment(payment.id);
                }}
                disabled={isApproving}
                title="Утвердить платеж"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  openRejectDialog(payment.id);
                }}
                disabled={isRejecting}
                title="Отклонить платеж"
              >
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Управление платежами</h1>
          <p className="text-gray-500">Просмотр, утверждение и управление платежами поставщиков</p>
        </div>
      </div>
      
      {/* Карточки со сводной информацией о платежах */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">На рассмотрении</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-gray-500">Ожидают вашего решения</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Утверждено</p>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-gray-500">Готовы к оплате</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Отклонено</p>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-xs text-gray-500">Требуют корректировки</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Сумма ожидаемых платежей</p>
              <p className="text-2xl font-bold">{pendingAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">На рассмотрении</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">Все платежи</TabsTrigger>
          <TabsTrigger value="pending">На рассмотрении</TabsTrigger>
          <TabsTrigger value="approved">Утвержденные</TabsTrigger>
          <TabsTrigger value="rejected">Отклоненные</TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {activeTab === 'all' ? 'Платежи' : 
              activeTab === 'pending' ? 'Платежи на рассмотрении' : 
              activeTab === 'approved' ? 'Утвержденные платежи' : 
              'Отклоненные платежи'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'all' ? 'Список всех платежей в системе' : 
              activeTab === 'pending' ? 'Платежи, ожидающие вашего утверждения' : 
              activeTab === 'approved' ? 'Список утвержденных платежей' : 
              'Список отклоненных платежей'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Поиск по номеру счета или поставщику..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDownSearch}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                </div>
                
                {activeTab === 'all' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Фильтр по статусу */}
                    <Select
                      value={statusFilter || 'all'}
                      onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="PENDING">На рассмотрении</SelectItem>
                        <SelectItem value="APPROVED">Утвержден</SelectItem>
                        <SelectItem value="PAID">Оплачен</SelectItem>
                        <SelectItem value="REJECTED">Отклонен</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Фильтр по дате начала */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-40">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFromFilter ? format(dateFromFilter, 'dd.MM.yyyy') : 'С даты'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFromFilter}
                          onSelect={setDateFromFilter}
                          initialFocus
                          locale={ru}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {/* Фильтр по дате окончания */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-40">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateToFilter ? format(dateToFilter, 'dd.MM.yyyy') : 'По дату'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateToFilter}
                          onSelect={setDateToFilter}
                          initialFocus
                          locale={ru}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button onClick={handleSearch}>
                    <Filter className="mr-2 h-4 w-4" />
                    Применить
                  </Button>
                  
                  <Button variant="outline" onClick={handleResetFilters}>
                    Сбросить
                  </Button>
                </div>
              </div>
              
              <DataTable
                columns={paymentsColumns}
                data={payments}
                loading={loading}
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: handlePageChange,
                }}
                onRowClick={(item) => router.push(`/manager/payments/${item.id}`)}
              />
              
              {!loading && payments.length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  Показано {payments.length} из {totalItems} платежей
                </div>
              )}
              
              {!loading && payments.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  {activeTab === 'pending' ? (
                    <>
                      <Clock className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                      <p>Нет платежей, ожидающих утверждения</p>
                    </>
                  ) : activeTab === 'approved' ? (
                    <>
                      <CheckCircle className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                      <p>Нет утвержденных платежей</p>
                    </>
                  ) : activeTab === 'rejected' ? (
                    <>
                      <XCircle className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                      <p>Нет отклоненных платежей</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                      <p>Платежи не найдены</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs>
      
      {/* Диалог отклонения платежа */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонение платежа</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения платежа. Эта информация будет отправлена специалисту по закупкам, создавшему платеж.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Причина отклонения</Label>
              <Textarea
                id="reject-reason"
                placeholder="Укажите причину отклонения платежа..."
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPayment}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? 'Отклонение...' : 'Отклонить платеж'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
