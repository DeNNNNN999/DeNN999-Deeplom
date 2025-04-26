import { create } from 'zustand';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import {
  Supplier,
  SupplierFilterInput,
  SupplierInput,
  SupplierRatingInput,
  SupplierUpdateInput,
  PaginationInput,
  PaginatedResponse,
} from '@/lib/graphql/types';
import {
  GET_SUPPLIER_QUERY,
  GET_SUPPLIERS_QUERY,
  GET_SUPPLIERS_BY_COUNTRY_QUERY,
  GET_SUPPLIERS_BY_CATEGORY_QUERY,
} from '@/lib/graphql/queries';
import {
  CREATE_SUPPLIER_MUTATION,
  UPDATE_SUPPLIER_MUTATION,
  DELETE_SUPPLIER_MUTATION,
  APPROVE_SUPPLIER_MUTATION,
  REJECT_SUPPLIER_MUTATION,
  RATE_SUPPLIER_MUTATION,
} from '@/lib/graphql/mutations';

interface SuppliersState {
  // Данные
  suppliers: Supplier[];
  currentSupplier: Supplier | null;
  paginatedData: PaginatedResponse<Supplier> | null;
  suppliersByCountry: Array<{ country: string; count: number }>;
  suppliersByCategory: Array<{ category: string; count: number }>;
  
  // Состояние
  loading: boolean;
  error: string | null;
  filter: SupplierFilterInput;
  pagination: PaginationInput;
  
  // Действия - основные операции CRUD
  fetchSupplier: (id: string) => Promise<Supplier | null>;
  fetchSuppliers: (pagination?: PaginationInput, filter?: SupplierFilterInput) => Promise<void>;
  createSupplier: (input: SupplierInput) => Promise<Supplier | null>;
  updateSupplier: (id: string, input: SupplierUpdateInput) => Promise<Supplier | null>;
  deleteSupplier: (id: string) => Promise<boolean>;
  
  // Действия - специфичные для бизнес-процессов
  approveSupplier: (id: string) => Promise<Supplier | null>;
  rejectSupplier: (id: string, reason: string) => Promise<Supplier | null>;
  rateSupplier: (input: SupplierRatingInput) => Promise<Supplier | null>;
  
  // Действия - аналитика
  fetchSuppliersByCountry: () => Promise<void>;
  fetchSuppliersByCategory: () => Promise<void>;
  
  // Вспомогательные действия
  setFilter: (filter: SupplierFilterInput) => void;
  setPagination: (pagination: PaginationInput) => void;
  resetFilter: () => void;
  clearSuppliers: () => void;
  setCurrentSupplier: (supplier: Supplier | null) => void;
}

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  // Начальное состояние
  suppliers: [],
  currentSupplier: null,
  paginatedData: null,
  suppliersByCountry: [],
  suppliersByCategory: [],
  loading: false,
  error: null,
  filter: {},
  pagination: { page: 1, limit: 10 },
  
  // Получение поставщика по ID
  fetchSupplier: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const { supplier } = await graphqlClient.request<{ supplier: Supplier }>(
        GET_SUPPLIER_QUERY,
        { id }
      );
      set({ currentSupplier: supplier });
      return supplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение списка поставщиков с пагинацией и фильтрацией
  fetchSuppliers: async (pagination, filter) => {
    try {
      const currentPagination = pagination || get().pagination;
      const currentFilter = filter || get().filter;
      
      set({ loading: true, error: null });
      
      const { suppliers } = await graphqlClient.request<{ 
        suppliers: PaginatedResponse<Supplier> 
      }>(
        GET_SUPPLIERS_QUERY,
        { 
          pagination: currentPagination,
          filter: currentFilter
        }
      );
      
      set({ 
        suppliers: suppliers.items,
        paginatedData: suppliers,
        pagination: currentPagination,
        filter: currentFilter
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке поставщиков';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Создание нового поставщика
  createSupplier: async (input: SupplierInput) => {
    try {
      set({ loading: true, error: null });
      
      const { createSupplier } = await graphqlClient.request<{ 
        createSupplier: Supplier 
      }>(
        CREATE_SUPPLIER_MUTATION,
        { input }
      );
      
      // Обновляем кеш после успешного создания
      set(state => ({
        suppliers: [createSupplier, ...state.suppliers],
        currentSupplier: createSupplier
      }));
      
      toast.success('Поставщик успешно создан');
      return createSupplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Обновление поставщика
  updateSupplier: async (id: string, input: SupplierUpdateInput) => {
    try {
      set({ loading: true, error: null });
      
      const { updateSupplier } = await graphqlClient.request<{ 
        updateSupplier: Supplier 
      }>(
        UPDATE_SUPPLIER_MUTATION,
        { id, input }
      );
      
      // Обновляем данные в локальном состоянии
      set(state => ({
        suppliers: state.suppliers.map(s => 
          s.id === id ? { ...s, ...updateSupplier } : s
        ),
        currentSupplier: state.currentSupplier?.id === id 
          ? { ...state.currentSupplier, ...updateSupplier }
          : state.currentSupplier
      }));
      
      toast.success('Поставщик успешно обновлен');
      return updateSupplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Удаление поставщика
  deleteSupplier: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { deleteSupplier } = await graphqlClient.request<{ 
        deleteSupplier: boolean 
      }>(
        DELETE_SUPPLIER_MUTATION,
        { id }
      );
      
      if (deleteSupplier) {
        // Удаляем поставщика из локального состояния
        set(state => ({
          suppliers: state.suppliers.filter(s => s.id !== id),
          currentSupplier: state.currentSupplier?.id === id 
            ? null 
            : state.currentSupplier
        }));
        
        toast.success('Поставщик успешно удален');
      }
      
      return deleteSupplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при удалении поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      set({ loading: false });
    }
  },
  
  // Утверждение поставщика
  approveSupplier: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { approveSupplier } = await graphqlClient.request<{ 
        approveSupplier: Supplier 
      }>(
        APPROVE_SUPPLIER_MUTATION,
        { id }
      );
      
      // Обновляем статус в локальном состоянии
      set(state => ({
        suppliers: state.suppliers.map(s => 
          s.id === id ? { ...s, ...approveSupplier } : s
        ),
        currentSupplier: state.currentSupplier?.id === id 
          ? { ...state.currentSupplier, ...approveSupplier }
          : state.currentSupplier
      }));
      
      toast.success('Поставщик успешно утвержден');
      return approveSupplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при утверждении поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Отклонение поставщика
  rejectSupplier: async (id: string, reason: string) => {
    try {
      set({ loading: true, error: null });
      
      const { rejectSupplier } = await graphqlClient.request<{ 
        rejectSupplier: Supplier 
      }>(
        REJECT_SUPPLIER_MUTATION,
        { id, reason }
      );
      
      // Обновляем статус в локальном состоянии
      set(state => ({
        suppliers: state.suppliers.map(s => 
          s.id === id ? { ...s, ...rejectSupplier } : s
        ),
        currentSupplier: state.currentSupplier?.id === id 
          ? { ...state.currentSupplier, ...rejectSupplier }
          : state.currentSupplier
      }));
      
      toast.success('Поставщик отклонен');
      return rejectSupplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при отклонении поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Оценка поставщика
  rateSupplier: async (input: SupplierRatingInput) => {
    try {
      set({ loading: true, error: null });
      
      const { rateSupplier } = await graphqlClient.request<{ 
        rateSupplier: Supplier 
      }>(
        RATE_SUPPLIER_MUTATION,
        { input }
      );
      
      // Обновляем рейтинг в локальном состоянии
      set(state => ({
        suppliers: state.suppliers.map(s => 
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
        ),
        currentSupplier: state.currentSupplier?.id === input.supplierId 
          ? { 
              ...state.currentSupplier, 
              financialStability: rateSupplier.financialStability,
              qualityRating: rateSupplier.qualityRating,
              deliveryRating: rateSupplier.deliveryRating,
              communicationRating: rateSupplier.communicationRating,
              overallRating: rateSupplier.overallRating
            }
          : state.currentSupplier
      }));
      
      toast.success('Оценка поставщика обновлена');
      return rateSupplier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при оценке поставщика';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение аналитики поставщиков по странам
  fetchSuppliersByCountry: async () => {
    try {
      set({ loading: true, error: null });
      
      const { suppliersByCountry } = await graphqlClient.request<{ 
        suppliersByCountry: Array<{ country: string; count: number }> 
      }>(
        GET_SUPPLIERS_BY_COUNTRY_QUERY
      );
      
      set({ suppliersByCountry });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке аналитики по странам';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение аналитики поставщиков по категориям
  fetchSuppliersByCategory: async () => {
    try {
      set({ loading: true, error: null });
      
      const { suppliersByCategory } = await graphqlClient.request<{ 
        suppliersByCategory: Array<{ category: string; count: number }> 
      }>(
        GET_SUPPLIERS_BY_CATEGORY_QUERY
      );
      
      set({ suppliersByCategory });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке аналитики по категориям';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Установка фильтра
  setFilter: (filter: SupplierFilterInput) => {
    set({ filter, pagination: { ...get().pagination, page: 1 } });
  },
  
  // Установка параметров пагинации
  setPagination: (pagination: PaginationInput) => {
    set({ pagination });
  },
  
  // Сброс фильтра
  resetFilter: () => {
    set({ filter: {}, pagination: { page: 1, limit: 10 } });
  },
  
  // Очистка списка поставщиков
  clearSuppliers: () => {
    set({ suppliers: [], paginatedData: null });
  },
  
  // Установка текущего поставщика
  setCurrentSupplier: (supplier: Supplier | null) => {
    set({ currentSupplier: supplier });
  }
}));
