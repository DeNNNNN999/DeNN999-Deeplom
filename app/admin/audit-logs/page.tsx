'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Filter, Search, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GET_AUDIT_LOGS_QUERY, GET_USERS_QUERY } from '@/lib/graphql/queries';
import { graphqlClient } from '@/lib/auth';
import { PaginationInput, AuditLogFilterInput } from '@/lib/graphql/types';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type AuditLog = {
  id: string;
  user: User | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditLogsResponse = {
  auditLogs: {
    items: AuditLog[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

type UsersResponse = {
  users: {
    items: User[];
  };
};

export default function AuditLogsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [isCalendarFromOpen, setIsCalendarFromOpen] = useState(false);
  const [isCalendarToOpen, setIsCalendarToOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, userFilter, actionFilter, entityTypeFilter, dateFrom, dateTo]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const pagination: PaginationInput = { page: currentPage, limit: pageSize };
      
      const filter: AuditLogFilterInput = {};
      if (userFilter) filter.userId = userFilter;
      if (actionFilter) filter.action = actionFilter;
      if (entityTypeFilter) filter.entityType = entityTypeFilter;
      if (dateFrom) filter.dateFrom = dateFrom.toISOString();
      if (dateTo) filter.dateTo = dateTo.toISOString();
      
      const variables = { pagination, filter };
      
      const data: AuditLogsResponse = await graphqlClient.request(GET_AUDIT_LOGS_QUERY, variables);
      
      setAuditLogs(data.auditLogs.items);
      setTotalLogs(data.auditLogs.total);
      setHasMore(data.auditLogs.hasMore);
      
      // Собираем уникальные значения для фильтров
      const actions = new Set<string>();
      const entities = new Set<string>();
      data.auditLogs.items.forEach(log => {
        actions.add(log.action);
        entities.add(log.entityType);
      });
      
      setActionTypes(Array.from(actions));
      setEntityTypes(Array.from(entities));
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Не удалось загрузить журнал аудита. Пожалуйста, попробуйте позже.');
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить журнал аудита',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data: UsersResponse = await graphqlClient.request(GET_USERS_QUERY, {
        pagination: { page: 1, limit: 100 },
      });
      setUsers(data.users.items);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleReset = () => {
    setSearchTerm('');
    setUserFilter(null);
    setActionFilter(null);
    setEntityTypeFilter(null);
    setDateFrom(null);
    setDateTo(null);
    setCurrentPage(1);
  };

  const handleExportData = () => {
    // CSV Export Logic
    let csvContent = 'ID,Пользователь,Действие,Тип сущности,ID сущности,IP-адрес,Дата\n';
    
    auditLogs.forEach(log => {
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Система';
      const row = [
        log.id,
        userName,
        log.action,
        log.entityType,
        log.entityId,
        log.ipAddress || 'N/A',
        new Date(log.createdAt).toLocaleString('ru-RU')
      ];
      
      // Экранирование запятых
      const escapedRow = row.map(field => {
        const stringField = String(field);
        return stringField.includes(',') ? `"${stringField}"` : stringField;
      });
      
      csvContent += escapedRow.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Экспорт данных',
      description: 'Данные успешно экспортированы в CSV формат',
      variant: 'success',
    });
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'approve':
        return 'bg-purple-100 text-purple-800';
      case 'reject':
        return 'bg-orange-100 text-orange-800';
      case 'login':
        return 'bg-teal-100 text-teal-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'user':
        return 'bg-cyan-100 text-cyan-800';
      case 'supplier':
        return 'bg-indigo-100 text-indigo-800';
      case 'contract':
        return 'bg-amber-100 text-amber-800';
      case 'payment':
        return 'bg-lime-100 text-lime-800';
      case 'document':
        return 'bg-rose-100 text-rose-800';
      case 'setting':
        return 'bg-violet-100 text-violet-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Форматирование значений для отображения в деталях
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'Нет данных';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value.toString();
  };

  // Определение количества страниц для пагинации
  const totalPages = Math.ceil(totalLogs / pageSize);

  // Генерация списка страниц для пагинации
  const getPageNumbers = () => {
    const pages = [];
    const maxPageButtons = 5;
    
    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Всегда показываем первую страницу
      pages.push(1);
      
      // Расчет средней части
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Добавляем разделитель, если нужно
      if (start > 2) {
        pages.push('...');
      }
      
      // Средние страницы
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Добавляем разделитель, если нужно
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      // Всегда показываем последнюю страницу
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Журнал аудита</CardTitle>
              <CardDescription>
                Просмотр всех действий, выполненных в системе
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={auditLogs.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Экспорт
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Input
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="col-span-1 md:col-span-1"
              />
              
              <Select value={userFilter || 'all'} onValueChange={(value) => setUserFilter(value === 'all' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Пользователь" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все пользователи</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={actionFilter || 'all'} onValueChange={(value) => setActionFilter(value === 'all' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Действие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все действия</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={entityTypeFilter || 'all'} onValueChange={(value) => setEntityTypeFilter(value === 'all' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Тип сущности" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Popover open={isCalendarFromOpen} onOpenChange={setIsCalendarFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'От даты'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => {
                          setDateFrom(date);
                          setIsCalendarFromOpen(false);
                        }}
                        initialFocus
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Popover open={isCalendarToOpen} onOpenChange={setIsCalendarToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, 'dd.MM.yyyy') : 'До даты'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => {
                          setDateTo(date);
                          setIsCalendarToOpen(false);
                        }}
                        initialFocus
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleReset}>
                Сбросить
              </Button>
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Применить
              </Button>
            </div>
          </form>
          
          <Separator className="my-6" />
          
          {error && (
            <div className="bg-red-50 p-4 rounded-md text-red-800 mb-6">
              {error}
            </div>
          )}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Тип сущности</TableHead>
                  <TableHead>ID сущности</TableHead>
                  <TableHead>IP-адрес</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Подробно</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Записи аудита не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Система'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEntityColor(log.entityType)}>
                          {log.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{log.entityId.substring(0, 8)}...</span>
                      </TableCell>
                      <TableCell>
                        {log.ipAddress || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewLogDetails(log)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Показано {auditLogs.length} из {totalLogs} записей
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Назад
                </Button>
                
                {getPageNumbers().map((page, index) => (
                  typeof page === 'number' ? (
                    <Button
                      key={index}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      disabled={isLoading}
                    >
                      {page}
                    </Button>
                  ) : (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      disabled
                    >
                      {page}
                    </Button>
                  )
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Вперед
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Диалоговое окно с подробной информацией */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Детали события аудита</DialogTitle>
            <DialogDescription>
              Подробная информация о событии в системе
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">ID события:</p>
                  <p className="text-sm font-mono">{selectedLog.id}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Дата и время:</p>
                  <p className="text-sm">{new Date(selectedLog.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Пользователь:</p>
                  <p className="text-sm">
                    {selectedLog.user 
                      ? `${selectedLog.user.firstName} ${selectedLog.user.lastName} (${selectedLog.user.email})`
                      : 'Система'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Действие:</p>
                  <Badge className={getActionBadgeColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Тип сущности:</p>
                  <Badge className={getEntityColor(selectedLog.entityType)}>
                    {selectedLog.entityType}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">ID сущности:</p>
                  <p className="text-sm font-mono">{selectedLog.entityId}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">IP-адрес:</p>
                  <p className="text-sm">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">User Agent:</p>
                  <p className="text-sm overflow-hidden text-ellipsis">{selectedLog.userAgent || 'N/A'}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Данные изменений</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Предыдущие значения</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-80">
                        {selectedLog.oldValues 
                          ? JSON.stringify(selectedLog.oldValues, null, 2)
                          : 'Нет данных'
                        }
                      </pre>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Новые значения</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-80">
                        {selectedLog.newValues 
                          ? JSON.stringify(selectedLog.newValues, null, 2)
                          : 'Нет данных'
                        }
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
