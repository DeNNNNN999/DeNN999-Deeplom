import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  GET_SUPPLIER_CATEGORY_QUERY,
  GET_SUPPLIER_CATEGORIES_QUERY,
  CREATE_SUPPLIER_CATEGORY_MUTATION,
  UPDATE_SUPPLIER_CATEGORY_MUTATION,
  DELETE_SUPPLIER_CATEGORY_MUTATION,
  SupplierCategory,
  SupplierCategoryInput,
  PaginationInput,
  PaginatedResponse
} from '@/lib/graphql';
import { graphqlClient } from '@/lib/auth';

interface UseSupplierCategoriesProps {
  id?: string;
  pagination?: PaginationInput;
  search?: string;
}

interface UseSupplierCategoriesReturn {
  supplierCategory: SupplierCategory | null;
  supplierCategories: SupplierCategory[];
  paginatedData: PaginatedResponse<SupplierCategory> | null;
  loading: boolean;
  error: Error | null;
  fetchSupplierCategory: (id: string) => Promise<void>;
  fetchSupplierCategories: (pagination?: PaginationInput, search?: string) => Promise<void>;
  createSupplierCategory: (input: SupplierCategoryInput) => Promise<SupplierCategory | null>;
  updateSupplierCategory: (id: string, input: SupplierCategoryInput) => Promise<SupplierCategory | null>;
  deleteSupplierCategory: (id: string) => Promise<boolean>;
}

export const useSupplierCategories = ({
  id,
  pagination = { page: 1, limit: 100 }, // По умолчанию загружаем больше категорий
  search
}: UseSupplierCategoriesProps = {}): UseSupplierCategoriesReturn => {
  const [supplierCategory, setSupplierCategory] = useState<SupplierCategory | null>(null);
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([]);
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<SupplierCategory> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Используем useRef для хранения неизменяемых ссылок на текущие значения пропсов
  const paginationRef = useRef(pagination);
  const searchRef = useRef(search);
  const idRef = useRef(id);
  
  // Обновляем refs при изменении пропсов
  useEffect(() => {
    paginationRef.current = pagination;
    searchRef.current = search;
    idRef.current = id;
  }, [pagination, search, id]);
  
  // Флаг для отслеживания первой загрузки
  const initialLoadDoneRef = useRef(false);

  const fetchSupplierCategory = useCallback(async (categoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { supplierCategory } = await graphqlClient.request<{ supplierCategory: SupplierCategory }>(
        GET_SUPPLIER_CATEGORY_QUERY,
        { id: categoryId }
      );
      setSupplierCategory(supplierCategory);
      return supplierCategory;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch supplier category');
      setError(error);
      toast.error(`Ошибка при загрузке категории: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupplierCategories = useCallback(async (
    newPagination?: PaginationInput,
    newSearch?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const variables = {
        pagination: newPagination || paginationRef.current,
        search: newSearch || searchRef.current
      };
      const { supplierCategories } = await graphqlClient.request<{ supplierCategories: PaginatedResponse<SupplierCategory> }>(
        GET_SUPPLIER_CATEGORIES_QUERY,
        variables
      );

      setSupplierCategories(supplierCategories.items);
      setPaginatedData(supplierCategories);
      return supplierCategories.items;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch supplier categories');
      setError(error);
      toast.error(`Ошибка при загрузке категорий: ${error.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createSupplierCategory = useCallback(async (input: SupplierCategoryInput): Promise<SupplierCategory | null> => {
    setLoading(true);
    setError(null);
    try {
      const { createSupplierCategory } = await graphqlClient.request<{ createSupplierCategory: SupplierCategory }>(
        CREATE_SUPPLIER_CATEGORY_MUTATION,
        { input }
      );
      
      // Обновляем список категорий в состоянии
      setSupplierCategories(prev => [createSupplierCategory, ...prev]);
      
      toast.success('Категория поставщика успешно создана');
      return createSupplierCategory;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create supplier category');
      setError(error);
      toast.error(`Ошибка при создании категории: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSupplierCategory = useCallback(async (
    categoryId: string,
    input: SupplierCategoryInput
  ): Promise<SupplierCategory | null> => {
    setLoading(true);
    setError(null);
    try {
      const { updateSupplierCategory } = await graphqlClient.request<{ updateSupplierCategory: SupplierCategory }>(
        UPDATE_SUPPLIER_CATEGORY_MUTATION,
        { id: categoryId, input }
      );

      // Обновляем текущую категорию, если она открыта
      setSupplierCategory(prev => 
        prev?.id === categoryId ? { ...prev, ...updateSupplierCategory } : prev
      );
      
      // Обновляем категорию в списке
      setSupplierCategories(prev => 
        prev.map(c => c.id === categoryId ? { ...c, ...updateSupplierCategory } : c)
      );

      toast.success('Категория поставщика успешно обновлена');
      return updateSupplierCategory;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update supplier category');
      setError(error);
      toast.error(`Ошибка при обновлении категории: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSupplierCategory = useCallback(async (categoryId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { deleteSupplierCategory } = await graphqlClient.request<{ deleteSupplierCategory: boolean }>(
        DELETE_SUPPLIER_CATEGORY_MUTATION,
        { id: categoryId }
      );

      if (deleteSupplierCategory) {
        // Обнуляем текущую категорию, если она была удалена
        setSupplierCategory(prev => 
          prev?.id === categoryId ? null : prev
        );
        
        // Удаляем категорию из списка
        setSupplierCategories(prev => 
          prev.filter(c => c.id !== categoryId)
        );
        
        toast.success('Категория поставщика успешно удалена');
      }

      return deleteSupplierCategory;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete supplier category');
      setError(error);
      toast.error(`Ошибка при удалении категории: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Эффект для первоначальной загрузки данных
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      if (id) {
        fetchSupplierCategory(id).then(() => {
          initialLoadDoneRef.current = true;
        });
      } else {
        fetchSupplierCategories().then(() => {
          initialLoadDoneRef.current = true;
        });
      }
    }
    // Этот эффект должен выполниться только один раз при монтировании компонента
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    supplierCategory,
    supplierCategories,
    paginatedData,
    loading,
    error,
    fetchSupplierCategory,
    fetchSupplierCategories,
    createSupplierCategory,
    updateSupplierCategory,
    deleteSupplierCategory
  };
};
