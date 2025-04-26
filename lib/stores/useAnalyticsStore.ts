import { create } from 'zustand';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import {
  AnalyticsSummary,
  SuppliersByCountry,
  SuppliersByCategory,
  ContractsByStatus,
  PaymentsByMonth,
  SystemStatistics,
  DatabaseStatistics,
} from '@/lib/graphql/types';
import {
  GET_ANALYTICS_SUMMARY_QUERY,
  GET_SUPPLIERS_BY_COUNTRY_QUERY,
  GET_SUPPLIERS_BY_CATEGORY_QUERY,
  GET_CONTRACTS_BY_STATUS_QUERY,
  GET_PAYMENTS_BY_MONTH_QUERY,
  GET_SYSTEM_STATISTICS_QUERY,
  GET_DATABASE_STATISTICS_QUERY,
} from '@/lib/graphql/queries';

interface AnalyticsState {
  // Данные
  summary: AnalyticsSummary | null;
  suppliersByCountry: SuppliersByCountry[];
  suppliersByCategory: SuppliersByCategory[];
  contractsByStatus: ContractsByStatus[];
  paymentsByMonth: PaymentsByMonth[];
  systemStatistics: SystemStatistics | null;
  databaseStatistics: DatabaseStatistics[];
  
  // Состояние
  loading: boolean;
  error: string | null;
  
  // Действия
  fetchAnalyticsSummary: () => Promise<void>;
  fetchSuppliersByCountry: () => Promise<void>;
  fetchSuppliersByCategory: () => Promise<void>;
  fetchContractsByStatus: () => Promise<void>;
  fetchPaymentsByMonth: (months: number) => Promise<void>;
  fetchSystemStatistics: () => Promise<void>;
  fetchDatabaseStatistics: () => Promise<void>;
  fetchAllAnalytics: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  // Начальное состояние
  summary: null,
  suppliersByCountry: [],
  suppliersByCategory: [],
  contractsByStatus: [],
  paymentsByMonth: [],
  systemStatistics: null,
  databaseStatistics: [],
  loading: false,
  error: null,
  
  // Получение сводки аналитики
  fetchAnalyticsSummary: async () => {
    try {
      set({ loading: true, error: null });
      
      const { analyticsSummary } = await graphqlClient.request<{ 
        analyticsSummary: AnalyticsSummary 
      }>(GET_ANALYTICS_SUMMARY_QUERY);
      
      set({ summary: analyticsSummary });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке аналитической сводки';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение распределения поставщиков по странам
  fetchSuppliersByCountry: async () => {
    try {
      set({ loading: true, error: null });
      
      const { suppliersByCountry } = await graphqlClient.request<{ 
        suppliersByCountry: SuppliersByCountry[] 
      }>(GET_SUPPLIERS_BY_COUNTRY_QUERY);
      
      set({ suppliersByCountry });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке распределения поставщиков по странам';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение распределения поставщиков по категориям
  fetchSuppliersByCategory: async () => {
    try {
      set({ loading: true, error: null });
      
      const { suppliersByCategory } = await graphqlClient.request<{ 
        suppliersByCategory: SuppliersByCategory[] 
      }>(GET_SUPPLIERS_BY_CATEGORY_QUERY);
      
      set({ suppliersByCategory });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке распределения поставщиков по категориям';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение распределения контрактов по статусам
  fetchContractsByStatus: async () => {
    try {
      set({ loading: true, error: null });
      
      const { contractsByStatus } = await graphqlClient.request<{ 
        contractsByStatus: ContractsByStatus[] 
      }>(GET_CONTRACTS_BY_STATUS_QUERY);
      
      set({ contractsByStatus });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке распределения контрактов по статусам';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение распределения платежей по месяцам
  fetchPaymentsByMonth: async (months: number) => {
    try {
      set({ loading: true, error: null });
      
      const { paymentsByMonth } = await graphqlClient.request<{ 
        paymentsByMonth: PaymentsByMonth[] 
      }>(GET_PAYMENTS_BY_MONTH_QUERY, { months });
      
      set({ paymentsByMonth });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке распределения платежей по месяцам';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение системной статистики
  fetchSystemStatistics: async () => {
    try {
      set({ loading: true, error: null });
      
      const { systemStatistics } = await graphqlClient.request<{ 
        systemStatistics: SystemStatistics 
      }>(GET_SYSTEM_STATISTICS_QUERY);
      
      set({ systemStatistics });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке системной статистики';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение статистики базы данных
  fetchDatabaseStatistics: async () => {
    try {
      set({ loading: true, error: null });
      
      const { databaseStatistics } = await graphqlClient.request<{ 
        databaseStatistics: DatabaseStatistics[] 
      }>(GET_DATABASE_STATISTICS_QUERY);
      
      set({ databaseStatistics });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке статистики базы данных';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Загрузка всех аналитических данных одновременно
  fetchAllAnalytics: async () => {
    try {
      set({ loading: true, error: null });
      
      // Используем Promise.all для параллельной загрузки данных
      const [
        { analyticsSummary },
        { suppliersByCountry },
        { suppliersByCategory },
        { contractsByStatus },
        { paymentsByMonth }
      ] = await Promise.all([
        graphqlClient.request<{ analyticsSummary: AnalyticsSummary }>(GET_ANALYTICS_SUMMARY_QUERY),
        graphqlClient.request<{ suppliersByCountry: SuppliersByCountry[] }>(GET_SUPPLIERS_BY_COUNTRY_QUERY),
        graphqlClient.request<{ suppliersByCategory: SuppliersByCategory[] }>(GET_SUPPLIERS_BY_CATEGORY_QUERY),
        graphqlClient.request<{ contractsByStatus: ContractsByStatus[] }>(GET_CONTRACTS_BY_STATUS_QUERY),
        graphqlClient.request<{ paymentsByMonth: PaymentsByMonth[] }>(GET_PAYMENTS_BY_MONTH_QUERY, { months: 12 })
      ]);
      
      set({
        summary: analyticsSummary,
        suppliersByCountry,
        suppliersByCategory,
        contractsByStatus,
        paymentsByMonth
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке аналитических данных';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  }
}));
