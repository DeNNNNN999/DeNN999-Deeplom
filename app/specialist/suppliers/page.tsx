'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { graphqlClient } from '@/lib/auth';
import { 
  GET_SUPPLIERS_QUERY, 
  GET_SUPPLIER_CATEGORIES_QUERY 
} from '@/lib/graphql/queries';
import { 
  Supplier, 
  SupplierStatus, 
  SupplierCategory, 
  PaginatedResponse 
} from '@/lib/graphql/types';

export default function SuppliersPage() {
  // Состояния для управления данными и UI
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([]);
  const [paginationData, setPaginationData] = useState({
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Функция для загрузки данных
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Формируем фильтр для запроса
      const filter: any = {};
      if (searchTerm) filter.search = searchTerm;
      if (selectedStatus !== 'all') filter.status = selectedStatus;
      if (selectedCategory !== 'all') filter.categoryIds = [selectedCategory];
      
      // Выполняем запрос на получение поставщиков
      const { suppliers } = await graphqlClient.request<{ suppliers: PaginatedResponse<Supplier> }>(
        GET_SUPPLIERS_QUERY,
        { 
          pagination: { page: currentPage, limit: 10 },
          filter
        }
      );
      
      setSuppliers(suppliers.items);
      setPaginationData({
        total: suppliers.total,
        page: suppliers.page,
        limit: suppliers.limit,
        hasMore: suppliers.hasMore
      });
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка категорий поставщиков
  const fetchCategories = async () => {
    try {
      const { supplierCategories } = await graphqlClient.request<{ 
        supplierCategories: PaginatedResponse<SupplierCategory> 
      }>(
        GET_SUPPLIER_CATEGORIES_QUERY,
        { pagination: { page: 1, limit: 100 } }
      );
      
      setSupplierCategories(supplierCategories.items);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Загрузка данных при первичном рендере и изменении фильтров
  useEffect(() => {
    fetchData();
  }, [currentPage]);

  // Загрузка категорий при первичном рендере
  useEffect(() => {
    fetchCategories();
  }, []);

  // Обработчики событий
  const handleSearch = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };
  
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };
  
  const handleFilterApply = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Поставщики</h1>
          <p className="text-gray-500">Управление информацией о поставщиках</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700" 
          asChild
        >
          <Link href="/specialist/suppliers/create">
            <Plus className="mr-2 h-5 w-5" />
            Добавить поставщика
          </Link>
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <div className="relative">
              <Input
                placeholder="Поиск поставщиков..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyDown={handleKeyDownSearch}
              />
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" 
              />
            </div>
          </div>
          
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value={SupplierStatus.PENDING}>На рассмотрении</SelectItem>
              <SelectItem value={SupplierStatus.APPROVED}>Утвержден</SelectItem>
              <SelectItem value={SupplierStatus.REJECTED}>Отклонен</SelectItem>
              <SelectItem value={SupplierStatus.INACTIVE}>Неактивен</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {supplierCategories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleFilterApply}>Применить</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Наименование</TableHead>
              <TableHead>Местоположение</TableHead>
              <TableHead>Категории</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата создания</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Индикатор загрузки
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                  <p className="mt-2 text-gray-500">Загрузка данных...</p>
                </TableCell>
              </TableRow>
            ) : error ? (
              // Отображение ошибки
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              // Пустой список
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                  Поставщики не найдены
                </TableCell>
              </TableRow>
            ) : (
              // Отображение списка поставщиков
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/specialist/suppliers/${supplier.id}`}
                      className="hover:text-blue-500 transition-colors"
                    >
                      {supplier.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">{supplier.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{supplier.country}</div>
                    {supplier.city && (
                      <div className="text-sm text-muted-foreground">{supplier.city}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {supplier.categories && supplier.categories.length > 0 ? (
                        <>
                          {supplier.categories.slice(0, 2).map((category) => (
                            <Badge key={category.id} variant="outline" className="text-xs">
                              {category.name}
                            </Badge>
                          ))}
                          {supplier.categories.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{supplier.categories.length - 2}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Нет категорий</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={supplier.status} />
                  </TableCell>
                  <TableCell>
                    {supplier.createdAt ? format(new Date(supplier.createdAt), 'dd.MM.yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Пагинация */}
        {!loading && suppliers.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              Показано {((paginationData.page - 1) * paginationData.limit) + 1} - {
                Math.min(paginationData.page * paginationData.limit, paginationData.total)
              } из {paginationData.total} поставщиков
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={paginationData.page <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Предыдущая
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!paginationData.hasMore}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Следующая
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
