import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import { 
  GET_ANALYTICS_SUMMARY_QUERY,
  GET_SUPPLIERS_BY_COUNTRY_QUERY,
  GET_SUPPLIERS_BY_CATEGORY_QUERY,
  GET_CONTRACTS_BY_STATUS_QUERY,
  GET_PAYMENTS_BY_MONTH_QUERY
} from '@/lib/graphql/queries';
import {
  AnalyticsSummary,
  SuppliersByCountry,
  SuppliersByCategory,
  ContractsByStatus,
  PaymentsByMonth
} from '@/lib/graphql/types';

interface UseAnalyticsReturn {
  loading: boolean;
  error: Error | null;
  analyticsSummary: AnalyticsSummary | null;
  suppliersByCountry: SuppliersByCountry[] | null;
  suppliersByCategory: SuppliersByCategory[] | null;
  contractsByStatus: ContractsByStatus[] | null;
  paymentsByMonth: PaymentsByMonth[] | null;
  fetchAnalyticsSummary: () => Promise<void>;
  fetchSuppliersByCountry: () => Promise<void>;
  fetchSuppliersByCategory: () => Promise<void>;
  fetchContractsByStatus: () => Promise<void>;
  fetchPaymentsByMonth: (months: number) => Promise<void>;
}

export const useAnalytics = (): UseAnalyticsReturn => {
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [suppliersByCountry, setSuppliersByCountry] = useState<SuppliersByCountry[] | null>(null);
  const [suppliersByCategory, setSuppliersByCategory] = useState<SuppliersByCategory[] | null>(null);
  const [contractsByStatus, setContractsByStatus] = useState<ContractsByStatus[] | null>(null);
  const [paymentsByMonth, setPaymentsByMonth] = useState<PaymentsByMonth[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalyticsSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { analyticsSummary } = await graphqlClient.request<{ analyticsSummary: AnalyticsSummary }>(
        GET_ANALYTICS_SUMMARY_QUERY
      );
      
      setAnalyticsSummary(analyticsSummary);
      return analyticsSummary;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке аналитики');
      setError(error);
      console.error('Error fetching analytics summary:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuppliersByCountry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { suppliersByCountry } = await graphqlClient.request<{ suppliersByCountry: SuppliersByCountry[] }>(
        GET_SUPPLIERS_BY_COUNTRY_QUERY
      );
      
      setSuppliersByCountry(suppliersByCountry);
      return suppliersByCountry;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке данных поставщиков по странам');
      setError(error);
      console.error('Error fetching suppliers by country:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuppliersByCategory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { suppliersByCategory } = await graphqlClient.request<{ suppliersByCategory: SuppliersByCategory[] }>(
        GET_SUPPLIERS_BY_CATEGORY_QUERY
      );
      
      setSuppliersByCategory(suppliersByCategory);
      return suppliersByCategory;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке данных поставщиков по категориям');
      setError(error);
      console.error('Error fetching suppliers by category:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContractsByStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { contractsByStatus } = await graphqlClient.request<{ contractsByStatus: ContractsByStatus[] }>(
        GET_CONTRACTS_BY_STATUS_QUERY
      );
      
      setContractsByStatus(contractsByStatus);
      return contractsByStatus;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке данных контрактов по статусам');
      setError(error);
      console.error('Error fetching contracts by status:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentsByMonth = useCallback(async (months: number = 12) => {
    try {
      setLoading(true);
      setError(null);
      
      const { paymentsByMonth } = await graphqlClient.request<{ paymentsByMonth: PaymentsByMonth[] }>(
        GET_PAYMENTS_BY_MONTH_QUERY,
        { months }
      );
      
      setPaymentsByMonth(paymentsByMonth);
      return paymentsByMonth;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке данных платежей по месяцам');
      setError(error);
      console.error('Error fetching payments by month:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsSummary();
  }, [fetchAnalyticsSummary]);

  return {
    loading,
    error,
    analyticsSummary,
    suppliersByCountry,
    suppliersByCategory,
    contractsByStatus,
    paymentsByMonth,
    fetchAnalyticsSummary,
    fetchSuppliersByCountry,
    fetchSuppliersByCategory,
    fetchContractsByStatus,
    fetchPaymentsByMonth
  };
};
