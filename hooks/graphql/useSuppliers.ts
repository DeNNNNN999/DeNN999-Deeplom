import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  GET_SUPPLIER_QUERY,
  GET_SUPPLIERS_QUERY,
  CREATE_SUPPLIER_MUTATION,
  UPDATE_SUPPLIER_MUTATION,
  DELETE_SUPPLIER_MUTATION,
  APPROVE_SUPPLIER_MUTATION,
  REJECT_SUPPLIER_MUTATION,
  RATE_SUPPLIER_MUTATION,
  Supplier,
  SupplierInput,
  SupplierUpdateInput,
  SupplierRatingInput,
  SupplierFilterInput,
  PaginationInput,
  PaginatedResponse
} from '@/lib/graphql';
import { graphqlClient } from '@/lib/auth';

interface UseSupplierProps {
  id?: string;
  pagination?: PaginationInput;
  filter?: SupplierFilterInput;
}

interface UseSupplierReturn {
  supplier: Supplier | null;
  suppliers: Supplier[];
  paginatedData: PaginatedResponse<Supplier> | null;
  loading: boolean;
  error: Error | null;
  fetchSupplier: (id: string) => Promise<void>;
  fetchSuppliers: (pagination?: PaginationInput, filter?: SupplierFilterInput) => Promise<void>;
  createSupplier: (input: SupplierInput) => Promise<Supplier | null>;
  updateSupplier: (id: string, input: SupplierUpdateInput) => Promise<Supplier | null>;
  deleteSupplier: (id: string) => Promise<boolean>;
  approveSupplier: (id: string) => Promise<Supplier | null>;
  rejectSupplier: (id: string, reason: string) => Promise<Supplier | null>;
  rateSupplier: (input: SupplierRatingInput) => Promise<Supplier | null>;
}

export const useSuppliers = ({
  id,
  pagination = { page: 1, limit: 10 },
  filter
}: UseSupplierProps = {}): UseSupplierReturn => {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<Supplier> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  // Добавим флаг для контроля первоначальной загрузки
  const [initialLoad, setInitialLoad] = useState<boolean>(false);

  const fetchSupplier = useCallback(async (supplierId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { supplier } = await graphqlClient.request<{ supplier: Supplier }>(
        GET_SUPPLIER_QUERY,
        { id: supplierId }
      );
      setSupplier(supplier);
      return supplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch supplier');
      setError(error);
      toast.error(`Ошибка при загрузке поставщика: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async (
    newPagination?: PaginationInput,
    newFilter?: SupplierFilterInput
  ) => {
    setLoading(true);
    setError(null);
    try {
      const variables = {
        pagination: newPagination || pagination,
        filter: newFilter || filter
      };
      const { suppliers } = await graphqlClient.request<{ suppliers: PaginatedResponse<Supplier> }>(
        GET_SUPPLIERS_QUERY,
        variables
      );

      setSuppliers(suppliers.items);
      setPaginatedData(suppliers);
      return suppliers.items;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch suppliers');
      setError(error);
      toast.error(`Ошибка при загрузке поставщиков: ${error.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [pagination, filter]);

  const createSupplier = useCallback(async (input: SupplierInput): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const { createSupplier } = await graphqlClient.request<{ createSupplier: Supplier }>(
        CREATE_SUPPLIER_MUTATION,
        { input }
      );
      toast.success('Поставщик успешно создан');
      return createSupplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create supplier');
      setError(error);
      toast.error(`Ошибка при создании поставщика: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSupplier = useCallback(async (
    supplierId: string,
    input: SupplierUpdateInput
  ): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const { updateSupplier } = await graphqlClient.request<{ updateSupplier: Supplier }>(
        UPDATE_SUPPLIER_MUTATION,
        { id: supplierId, input }
      );

      if (supplier && supplier.id === supplierId) {
        setSupplier({ ...supplier, ...updateSupplier });
      }

      toast.success('Поставщик успешно обновлен');
      return updateSupplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update supplier');
      setError(error);
      toast.error(`Ошибка при обновлении поставщика: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supplier]);

  const deleteSupplier = useCallback(async (supplierId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { deleteSupplier } = await graphqlClient.request<{ deleteSupplier: boolean }>(
        DELETE_SUPPLIER_MUTATION,
        { id: supplierId }
      );

      if (deleteSupplier) {
        toast.success('Поставщик успешно удален');

        if (supplier && supplier.id === supplierId) {
          setSupplier(null);
        }

        if (suppliers.length > 0) {
          setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.id !== supplierId));
        }
      }

      return deleteSupplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete supplier');
      setError(error);
      toast.error(`Ошибка при удалении поставщика: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supplier, suppliers.length]);

  const approveSupplier = useCallback(async (supplierId: string): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const { approveSupplier } = await graphqlClient.request<{ approveSupplier: Supplier }>(
        APPROVE_SUPPLIER_MUTATION,
        { id: supplierId }
      );

      if (supplier && supplier.id === supplierId) {
        setSupplier(prevSupplier => prevSupplier ? { ...prevSupplier, ...approveSupplier } : null);
      }

      if (suppliers.length > 0) {
        setSuppliers(prevSuppliers => prevSuppliers.map(s =>
          s.id === supplierId ? { ...s, status: approveSupplier.status } : s
        ));
      }

      toast.success('Поставщик успешно утвержден');
      return approveSupplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to approve supplier');
      setError(error);
      toast.error(`Ошибка при утверждении поставщика: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supplier, suppliers.length]);

  const rejectSupplier = useCallback(async (
    supplierId: string,
    reason: string
  ): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const { rejectSupplier } = await graphqlClient.request<{ rejectSupplier: Supplier }>(
        REJECT_SUPPLIER_MUTATION,
        { id: supplierId, reason }
      );

      if (supplier && supplier.id === supplierId) {
        setSupplier(prevSupplier => prevSupplier ? { ...prevSupplier, ...rejectSupplier } : null);
      }

      if (suppliers.length > 0) {
        setSuppliers(prevSuppliers => prevSuppliers.map(s =>
          s.id === supplierId ? { ...s, status: rejectSupplier.status } : s
        ));
      }

      toast.success('Поставщик отклонен');
      return rejectSupplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reject supplier');
      setError(error);
      toast.error(`Ошибка при отклонении поставщика: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supplier, suppliers.length]);

  const rateSupplier = useCallback(async (
    input: SupplierRatingInput
  ): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const { rateSupplier } = await graphqlClient.request<{ rateSupplier: Supplier }>(
        RATE_SUPPLIER_MUTATION,
        { input }
      );

      if (supplier && supplier.id === input.supplierId) {
        setSupplier(prevSupplier => {
          if (!prevSupplier) return null;
          return {
            ...prevSupplier,
            financialStability: rateSupplier.financialStability,
            qualityRating: rateSupplier.qualityRating,
            deliveryRating: rateSupplier.deliveryRating,
            communicationRating: rateSupplier.communicationRating,
            overallRating: rateSupplier.overallRating
          };
        });
      }

      if (suppliers.length > 0) {
        setSuppliers(prevSuppliers => prevSuppliers.map(s =>
          s.id === input.supplierId
            ? {
                ...s,
                financialStability: rateSupplier.financialStability,
                qualityRating: rateSupplier.qualityRating,
                deliveryRating: rateSupplier.deliveryRating,
                communicationRating: rateSupplier.communicationRating,
                overallRating: rateSupplier.overallRating
              }
            : s
        ));
      }

      toast.success('Оценка поставщика обновлена');
      return rateSupplier;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to rate supplier');
      setError(error);
      toast.error(`Ошибка при оценке поставщика: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supplier, suppliers.length]);

  // Используем отдельный эффект для первоначальной загрузки
  useEffect(() => {
    if (initialLoad) return;
    
    if (id) {
      fetchSupplier(id).then(() => setInitialLoad(true));
    } else {
      fetchSuppliers().then(() => setInitialLoad(true));
    }
    
    // Отмечаем, что первоначальная загрузка была выполнена
    return () => setInitialLoad(false);
  }, []); // Пустой массив зависимостей

  return {
    supplier,
    suppliers,
    paginatedData,
    loading,
    error,
    fetchSupplier,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    approveSupplier,
    rejectSupplier,
    rateSupplier
  };
};
