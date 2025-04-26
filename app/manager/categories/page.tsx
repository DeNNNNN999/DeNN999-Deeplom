'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { graphqlClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  Tag,
  Check,
  X 
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  GET_SUPPLIER_CATEGORIES_QUERY, 
  GET_SUPPLIERS_BY_CATEGORY_QUERY 
} from '@/lib/graphql/queries';
import {
  CREATE_SUPPLIER_CATEGORY_MUTATION,
  UPDATE_SUPPLIER_CATEGORY_MUTATION,
  DELETE_SUPPLIER_CATEGORY_MUTATION
} from '@/lib/graphql/mutations';

// Типы данных
type User = {
  id: string;
  firstName: string;
  lastName: string;
};

type SupplierCategory = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: User | null;
};

type CategoryCount = {
  category: string;
  count: number;
};

// Типы для ответов от GraphQL запросов
type SupplierCategoriesResponse = {
  supplierCategories: {
    items: SupplierCategory[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

type SuppliersByCategoryResponse = {
  suppliersByCategory: CategoryCount[];
};

// Схема валидации формы
const categorySchema = z.object({
  name: z.string().min(2, { message: 'Название должно содержать минимум 2 символа' }).max(50, { message: 'Название не должно превышать 50 символов' }),
  description: z.string().max(500, { message: 'Описание не должно превышать 500 символов' }).optional().nullable(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function ManagerCategoriesPage() {
  const router = useRouter();
  
  // Состояния для списка категорий
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Состояния для диалогов и форм
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Состояния для статистики
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);

  // Формы для создания и редактирования
  const createForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  // Загрузка категорий при монтировании компонента
  useEffect(() => {
    fetchCategories();
    fetchCategoryCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Загрузка категорий при изменении страницы или поискового запроса
  useEffect(() => {
    fetchCategories(currentPage, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Загрузка категорий с сервера
  const fetchCategories = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const variables = {
        pagination: { page, limit: 10 },
        search: search || undefined,
      };

      const response = await graphqlClient.request<SupplierCategoriesResponse>(
        GET_SUPPLIER_CATEGORIES_QUERY, 
        variables
      );
      
      if (response && response.supplierCategories) {
        setCategories(response.supplierCategories.items || []);
        setTotalPages(Math.ceil((response.supplierCategories.total || 0) / 10));
        setTotalItems(response.supplierCategories.total || 0);
        setCurrentPage(response.supplierCategories.page || 1);
      } else {
        setCategories([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке категорий:', error);
      toast.error('Не удалось загрузить категории поставщиков');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка статистики по категориям
  const fetchCategoryCounts = async () => {
    try {
      const response = await graphqlClient.request<SuppliersByCategoryResponse>(
        GET_SUPPLIERS_BY_CATEGORY_QUERY
      );
      
      if (response && response.suppliersByCategory) {
        setCategoryCounts(response.suppliersByCategory);
      }
    } catch (error) {
      console.error('Ошибка при загрузке статистики категорий:', error);
    }
  };

  // Обработка поиска
  const handleSearch = () => {
    setCurrentPage(1);
    fetchCategories(1, searchTerm);
  };
  
  // Обработка нажатия Enter в поле поиска
  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Обработка смены страницы
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Создание новой категории
  const handleCreateCategory = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      await graphqlClient.request(CREATE_SUPPLIER_CATEGORY_MUTATION, {
        input: data
      });
      
      toast.success('Категория успешно создана');
      setIsCreateDialogOpen(false);
      createForm.reset();
      
      // Обновляем список категорий и статистику
      fetchCategories(currentPage, searchTerm);
      fetchCategoryCounts();
    } catch (error: any) {
      console.error('Ошибка при создании категории:', error);
      toast.error('Не удалось создать категорию');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Редактирование категории
  const handleEditCategory = async (data: CategoryFormValues) => {
    if (!selectedCategory) return;
    
    setIsSubmitting(true);
    try {
      await graphqlClient.request(UPDATE_SUPPLIER_CATEGORY_MUTATION, {
        id: selectedCategory.id,
        input: data
      });
      
      toast.success('Категория успешно обновлена');
      setIsEditDialogOpen(false);
      
      // Обновляем список категорий и статистику
      fetchCategories(currentPage, searchTerm);
      fetchCategoryCounts();
    } catch (error: any) {
      console.error('Ошибка при обновлении категории:', error);
      toast.error('Не удалось обновить категорию');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Удаление категории
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    setIsSubmitting(true);
    try {
      // Проверяем, есть ли поставщики в этой категории
      const categoryCount = categoryCounts.find(c => c.category === selectedCategory.name);
      if (categoryCount && categoryCount.count > 0) {
        throw new Error(`Невозможно удалить категорию, так как она используется ${categoryCount.count} поставщиками`);
      }
      
      await graphqlClient.request(DELETE_SUPPLIER_CATEGORY_MUTATION, {
        id: selectedCategory.id
      });
      
      toast.success('Категория успешно удалена');
      setIsDeleteDialogOpen(false);
      
      // Обновляем список категорий и статистику
      fetchCategories(currentPage, searchTerm);
      fetchCategoryCounts();
    } catch (error: any) {
      console.error('Ошибка при удалении категории:', error);
      toast.error(error.message || 'Не удалось удалить категорию');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Открытие диалога редактирования
  const openEditDialog = (category: SupplierCategory) => {
    setSelectedCategory(category);
    editForm.reset({
      name: category.name,
      description: category.description || '',
    });
    setIsEditDialogOpen(true);
  };
  
  // Открытие диалога удаления
  const openDeleteDialog = (category: SupplierCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };
  
  // Получение числа поставщиков для категории
  const getSuppliersCount = (categoryName: string) => {
    const category = categoryCounts.find(c => c.category === categoryName);
    return category ? category.count : 0;
  };

  // Колонки для таблицы категорий
  const categoriesColumns = [
    {
      header: 'Название',
      accessorKey: 'name',
      cell: (category: SupplierCategory) => (
        <div className="font-medium">{category.name}</div>
      ),
    },
    {
      header: 'Описание',
      accessorKey: 'description',
      cell: (category: SupplierCategory) => category.description || '-',
    },
    {
      header: 'Поставщиков',
      accessorKey: 'id',
      cell: (category: SupplierCategory) => (
        <div className="text-center">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {getSuppliersCount(category.name)}
          </span>
        </div>
      ),
    },
    {
      header: 'Создано',
      accessorKey: 'createdAt',
      cell: (category: SupplierCategory) => (
        <div>
          <div>{format(new Date(category.createdAt), 'dd.MM.yyyy')}</div>
          <div className="text-xs text-gray-500">
            {category.createdBy ? `${category.createdBy.firstName} ${category.createdBy.lastName}` : '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Действия',
      accessorKey: 'actions',
      cell: (category: SupplierCategory) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(category);
            }}
            title="Редактировать"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(category);
            }}
            title="Удалить"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Категории поставщиков</h1>
          <p className="text-gray-500">Управление категориями для классификации поставщиков</p>
        </div>
        <Button
          onClick={() => {
            createForm.reset();
            setIsCreateDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Создать категорию
        </Button>
      </div>
      
      {/* Информационная карточка */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start">
            <Tag className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">Для чего нужны категории?</p>
              <p className="text-xs text-blue-700 mt-1">
                Категории помогают классифицировать поставщиков по типу предоставляемых товаров или услуг.
                Это упрощает поиск, фильтрацию и анализ данных о поставщиках в системе.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Список категорий</CardTitle>
          <CardDescription>
            Всего категорий: {totalItems}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="Поиск по названию или описанию..."
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
              <Button onClick={handleSearch}>Поиск</Button>
            </div>
            
            <DataTable
              columns={categoriesColumns}
              data={categories}
              loading={loading}
              pagination={{
                currentPage,
                totalPages,
                onPageChange: handlePageChange,
              }}
            />
            
            {!loading && categories.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Показано {categories.length} из {totalItems} категорий
              </div>
            )}
            
            {!loading && categories.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <Tag className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                <p>Категории не найдены</p>
                <Button 
                  variant="link" 
                  onClick={() => {
                    createForm.reset();
                    setIsCreateDialogOpen(true);
                  }}
                >
                  Создать первую категорию
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Диалог создания категории */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание категории</DialogTitle>
            <DialogDescription>
              Добавьте новую категорию для классификации поставщиков
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={createForm.handleSubmit(handleCreateCategory)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Название <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Например: Товары для офиса"
                  {...createForm.register('name')}
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Опишите категорию поставщиков..."
                  rows={4}
                  {...createForm.register('description')}
                />
                {createForm.formState.errors.description && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Создание...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4" />
                    Создать
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования категории */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование категории</DialogTitle>
            <DialogDescription>
              Измените информацию о категории
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(handleEditCategory)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Название <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Например: Товары для офиса"
                  {...editForm.register('name')}
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Описание</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Опишите категорию поставщиков..."
                  rows={4}
                  {...editForm.register('description')}
                />
                {editForm.formState.errors.description && (
                  <p className="text-sm text-red-500">
                    {editForm.formState.errors.description.message}
                  </p>
                )}
              </div>
              
              {selectedCategory && (
                <div className="pt-2 text-sm text-gray-500">
                  <p>Поставщиков в категории: {getSuppliersCount(selectedCategory.name)}</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Check className="mr-2 h-4 w-4" />
                    Сохранить
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCategory && getSuppliersCount(selectedCategory.name) > 0 ? (
                <span className="text-red-500 font-medium">
                  Невозможно удалить категорию "{selectedCategory.name}", так как она используется {getSuppliersCount(selectedCategory.name)} поставщиками.
                </span>
              ) : (
                <span>
                  Эта операция не может быть отменена. Категория будет удалена из системы.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCategory();
              }}
              disabled={isSubmitting || (selectedCategory && getSuppliersCount(selectedCategory.name) > 0)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Удаление...
                </div>
              ) : (
                <div className="flex items-center">
                  <X className="mr-2 h-4 w-4" />
                  Удалить
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
