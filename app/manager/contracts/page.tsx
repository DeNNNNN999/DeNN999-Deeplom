'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { graphqlClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  Eye, 
  CheckCircle, 
  XCircle,
  Calendar as CalendarIcon
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  GET_CONTRACTS_QUERY,
  GET_EXPIRING_CONTRACTS_QUERY,
  GET_CONTRACT_EXPIRATION_SUMMARY
} from '@/lib/graphql/queries';
import {
  APPROVE_CONTRACT_MUTATION,
  REJECT_CONTRACT_MUTATION
} from '@/lib/graphql/mutations';

// Типы для данных контракта
type Supplier = {
  id: string;
  name: string;
};

type Contract = {
  id: string;
  title: string;
  supplier: Supplier;
  contractNumber: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: string;
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
};

// Типы для ответов от GraphQL запросов
type ContractsResponse = {
  contracts: {
    items: Contract[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

type ExpiringContractsResponse = {
  expiringContracts: {
    items: Contract[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

type ContractExpirationSummaryResponse = {
  contractExpirationSummary: {
    expiringSoon: number;
    expiringLater: number;
    expired: number;
    highValueContract: Contract | null;
  };
};

export default function ManagerContractsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  
  // Состояния для всех контрактов
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFromFilter, setDateFromFilter] = useState<Date | null>(null);
  const [dateToFilter, setDateToFilter] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Состояния для истекающих контрактов
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [loadingExpiring, setLoadingExpiring] = useState(true);
  const [expiringCurrentPage, setExpiringCurrentPage] = useState(1);
  const [expiringTotalPages, setExpiringTotalPages] = useState(1);
  const [expiringTotalItems, setExpiringTotalItems] = useState(0);
  
  // Состояния для сводки о контрактах
  const [expirationSummary, setExpirationSummary] = useState<{
    expiringSoon: number;
    expiringLater: number;
    expired: number;
    highValueContract: Contract | null;
  } | null>(null);
  
  // Состояния для модальных окон
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchContractsSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Загрузка контрактов при изменении фильтров
  useEffect(() => {
    fetchContracts(currentPage, searchTerm, statusFilter, dateFromFilter, dateToFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, activeTab]);
  
  // Загрузка истекающих контрактов при изменении страницы
  useEffect(() => {
    if (activeTab === 'expiring') {
      fetchExpiringContracts(expiringCurrentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiringCurrentPage, activeTab]);

  // Загрузка всех контрактов с применением фильтров
  const fetchContracts = async (page = 1, search = '', status: string | null = null, dateFrom: Date | null = null, dateTo: Date | null = null) => {
    if (activeTab !== 'all') return;
    
    setLoading(true);
    try {
      const filter: Record<string, any> = {};
      
      if (search) filter.search = search;
      if (status) filter.status = status;
      
      if (dateFrom) filter.startDateFrom = dateFrom.toISOString();
      if (dateTo) filter.endDateTo = dateTo.toISOString();
      
      const response = await graphqlClient.request<ContractsResponse>(GET_CONTRACTS_QUERY, {
        pagination: { page, limit: 10 },
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      if (response && response.contracts) {
        setContracts(response.contracts.items || []);
        setTotalPages(Math.ceil((response.contracts.total || 0) / 10));
        setTotalItems(response.contracts.total || 0);
        setCurrentPage(response.contracts.page || 1);
      } else {
        setContracts([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке контрактов:', error);
      toast.error('Не удалось загрузить контракты');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка истекающих контрактов
  const fetchExpiringContracts = async (page = 1) => {
    setLoadingExpiring(true);
    try {
      const response = await graphqlClient.request<ExpiringContractsResponse>(GET_EXPIRING_CONTRACTS_QUERY, {
        daysThreshold: 30, // Контракты, истекающие в течение 30 дней
        pagination: { page, limit: 10 }
      });
      
      if (response && response.expiringContracts) {
        setExpiringContracts(response.expiringContracts.items || []);
        setExpiringTotalPages(Math.ceil((response.expiringContracts.total || 0) / 10));
        setExpiringTotalItems(response.expiringContracts.total || 0);
        setExpiringCurrentPage(response.expiringContracts.page || 1);
      } else {
        setExpiringContracts([]);
        setExpiringTotalPages(1);
        setExpiringTotalItems(0);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке истекающих контрактов:', error);
      toast.error('Не удалось загрузить истекающие контракты');
      setExpiringContracts([]);
    } finally {
      setLoadingExpiring(false);
    }
  };
  
  // Загрузка сводки о контрактах
  const fetchContractsSummary = async () => {
    try {
      const response = await graphqlClient.request<ContractExpirationSummaryResponse>(GET_CONTRACT_EXPIRATION_SUMMARY);
      
      if (response && response.contractExpirationSummary) {
        setExpirationSummary(response.contractExpirationSummary);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке сводки по контрактам:', error);
      toast.error('Не удалось загрузить сводку по контрактам');
    }
  };

  // Обработка поиска
  const handleSearch = () => {
    setCurrentPage(1);
    fetchContracts(1, searchTerm, statusFilter, dateFromFilter, dateToFilter);
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
    fetchContracts(1);
  };
  
  // Обработка смены страницы для обычных контрактов
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Обработка смены страницы для истекающих контрактов
  const handleExpiringPageChange = (page: number) => {
    setExpiringCurrentPage(page);
  };
  
  // Обработка смены вкладки
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'expiring' && expiringContracts.length === 0) {
      fetchExpiringContracts();
    }
  };
  
  // Утверждение контракта
  const handleApproveContract = async (contractId: string) => {
    setIsApproving(true);
    try {
      await graphqlClient.request(APPROVE_CONTRACT_MUTATION, { id: contractId });
      toast.success('Контракт успешно утвержден');
      
      // Обновляем данные в зависимости от текущей вкладки
      if (activeTab === 'all') {
        fetchContracts(currentPage, searchTerm, statusFilter, dateFromFilter, dateToFilter);
      } else {
        fetchExpiringContracts(expiringCurrentPage);
      }
      
      // Обновляем сводку
      fetchContractsSummary();
    } catch (error: any) {
      console.error('Ошибка при утверждении контракта:', error);
      toast.error('Не удалось утвердить контракт');
    } finally {
      setIsApproving(false);
    }
  };
  
  // Открытие диалога отклонения контракта
  const openRejectDialog = (contractId: string) => {
    setSelectedContractId(contractId);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };
  
  // Отклонение контракта
  const handleRejectContract = async () => {
    if (!selectedContractId) return;
    
    setIsRejecting(true);
    try {
      await graphqlClient.request(REJECT_CONTRACT_MUTATION, {
        id: selectedContractId,
        reason: rejectReason
      });
      
      toast.success('Контракт отклонен');
      setIsRejectDialogOpen(false);
      
      // Обновляем данные в зависимости от текущей вкладки
      if (activeTab === 'all') {
        fetchContracts(currentPage, searchTerm, statusFilter, dateFromFilter, dateToFilter);
      } else {
        fetchExpiringContracts(expiringCurrentPage);
      }
      
      // Обновляем сводку
      fetchContractsSummary();
    } catch (error: any) {
      console.error('Ошибка при отклонении контракта:', error);
      toast.error('Не удалось отклонить контракт');
    } finally {
      setIsRejecting(false);
    }
  };

  // Форматирование даты для отображения
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: ru });
  };
  
  // Получение класса статуса для визуального отображения
  const getStatusClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'TERMINATED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Получение перевода статуса на русский язык
  const getStatusTranslation = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return 'Черновик';
      case 'PENDING_APPROVAL':
        return 'На утверждении';
      case 'APPROVED':
        return 'Утвержден';
      case 'ACTIVE':
        return 'Активен';
      case 'EXPIRED':
        return 'Истек';
      case 'TERMINATED':
        return 'Расторгнут';
      default:
        return status;
    }
  };

  // Колонки для таблицы всех контрактов
  const contractsColumns = [
    {
      header: 'Номер контракта',
      accessorKey: 'contractNumber',
      cell: (contract: Contract) => (
        <div className="font-medium">{contract.contractNumber}</div>
      ),
    },
    {
      header: 'Название',
      accessorKey: 'title',
      cell: (contract: Contract) => contract.title,
    },
    {
      header: 'Поставщик',
      accessorKey: 'supplier.name',
      cell: (contract: Contract) => contract.supplier.name,
    },
    {
      header: 'Стоимость',
      accessorKey: 'value',
      cell: (contract: Contract) => `${contract.currency} ${contract.value.toLocaleString()}`,
    },
    {
      header: 'Срок действия',
      accessorKey: 'endDate',
      cell: (contract: Contract) => (
        <div className="flex flex-col">
          <span>{formatDate(contract.startDate)} -</span>
          <span>{formatDate(contract.endDate)}</span>
        </div>
      ),
    },
    {
      header: 'Статус',
      accessorKey: 'status',
      cell: (contract: Contract) => (
        <StatusBadge status={contract.status} />
      ),
    },
    {
      header: 'Действия',
      accessorKey: 'id',
      cell: (contract: Contract) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/manager/contracts/${contract.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {contract.status === 'PENDING_APPROVAL' && (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveContract(contract.id);
                }}
                disabled={isApproving}
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  openRejectDialog(contract.id);
                }}
                disabled={isRejecting}
              >
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];
  
  // Колонки для таблицы истекающих контрактов
  const expiringContractsColumns = [
    {
      header: 'Номер контракта',
      accessorKey: 'contractNumber',
      cell: (contract: Contract) => (
        <div className="font-medium">{contract.contractNumber}</div>
      ),
    },
    {
      header: 'Название',
      accessorKey: 'title',
      cell: (contract: Contract) => contract.title,
    },
    {
      header: 'Поставщик',
      accessorKey: 'supplier.name',
      cell: (contract: Contract) => contract.supplier.name,
    },
    {
      header: 'Стоимость',
      accessorKey: 'value',
      cell: (contract: Contract) => `${contract.currency} ${contract.value.toLocaleString()}`,
    },
    {
      header: 'Дата окончания',
      accessorKey: 'endDate',
      cell: (contract: Contract) => formatDate(contract.endDate),
    },
    {
      header: 'Осталось дней',
      accessorKey: 'daysRemaining',
      cell: (contract: Contract) => (
        <div className={`font-medium ${contract.daysRemaining && contract.daysRemaining <= 7 ? 'text-red-600' : contract.daysRemaining && contract.daysRemaining <= 14 ? 'text-orange-600' : 'text-blue-600'}`}>
          {contract.daysRemaining} дн.
        </div>
      ),
    },
    {
      header: 'Действия',
      accessorKey: 'id',
      cell: (contract: Contract) => (
        <Button 
          variant="ghost" 
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/manager/contracts/${contract.id}`);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Управление контрактами</h1>
          <p className="text-gray-500">Просмотр, утверждение и управление контрактами</p>
        </div>
      </div>
      
      {/* Карточки со сводной информацией о контрактах */}
      {expirationSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Скоро истекают</p>
                <p className="text-2xl font-bold">{expirationSummary.expiringSoon}</p>
                <p className="text-xs text-gray-500">В течение 30 дней</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Истекли</p>
                <p className="text-2xl font-bold">{expirationSummary.expired}</p>
                <p className="text-xs text-gray-500">Требуют обновления</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">На утверждении</p>
                <p className="text-2xl font-bold">
                  {contracts.filter(contract => contract.status === 'PENDING_APPROVAL').length}
                </p>
                <p className="text-xs text-gray-500">Ожидают вашего решения</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">Все контракты</TabsTrigger>
          <TabsTrigger value="expiring">Истекающие контракты</TabsTrigger>
          <TabsTrigger value="pending">На утверждении</TabsTrigger>
        </TabsList>
        
        {/* Вкладка со всеми контрактами */}
        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Контракты</CardTitle>
              <CardDescription>
                Список всех контрактов в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Поиск по названию или номеру контракта..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDownSearch}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                  </div>
                  
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
                        <SelectItem value="DRAFT">Черновик</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">На утверждении</SelectItem>
                        <SelectItem value="APPROVED">Утвержден</SelectItem>
                        <SelectItem value="ACTIVE">Активен</SelectItem>
                        <SelectItem value="EXPIRED">Истек</SelectItem>
                        <SelectItem value="TERMINATED">Расторгнут</SelectItem>
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
                  columns={contractsColumns}
                  data={contracts}
                  loading={loading}
                  pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: handlePageChange,
                  }}
                  onRowClick={(item) => router.push(`/manager/contracts/${item.id}`)}
                />
                
                {!loading && contracts.length > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    Показано {contracts.length} из {totalItems} контрактов
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Вкладка с истекающими контрактами */}
        <TabsContent value="expiring">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Истекающие контракты</CardTitle>
              <CardDescription>
                Контракты, срок действия которых истекает в течение 30 дней
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={expiringContractsColumns}
                data={expiringContracts}
                loading={loadingExpiring}
                pagination={{
                  currentPage: expiringCurrentPage,
                  totalPages: expiringTotalPages,
                  onPageChange: handleExpiringPageChange,
                }}
                onRowClick={(item) => router.push(`/manager/contracts/${item.id}`)}
              />
              
              {!loadingExpiring && expiringContracts.length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  Показано {expiringContracts.length} из {expiringTotalItems} контрактов
                </div>
              )}
              
              {!loadingExpiring && expiringContracts.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Clock className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                  <p>В ближайшее время нет истекающих контрактов</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Вкладка с контрактами на утверждении */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Контракты на утверждении</CardTitle>
              <CardDescription>
                Контракты, ожидающие вашего утверждения
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={contractsColumns}
                data={contracts.filter(contract => contract.status === 'PENDING_APPROVAL')}
                loading={loading}
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: handlePageChange,
                }}
                onRowClick={(item) => router.push(`/manager/contracts/${item.id}`)}
              />
              
              {!loading && contracts.filter(contract => contract.status === 'PENDING_APPROVAL').length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                  <p>Нет контрактов, ожидающих утверждения</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Диалог отклонения контракта */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонение контракта</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения контракта. Эта информация будет отправлена специалисту по закупкам, создавшему контракт.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Причина отклонения</Label>
              <Textarea
                id="reject-reason"
                placeholder="Укажите причину отклонения контракта..."
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
              onClick={handleRejectContract}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? 'Отклонение...' : 'Отклонить контракт'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
