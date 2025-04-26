import { create } from 'zustand';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import {
  Payment,
  PaymentFilterInput,
  PaymentInput,
  PaymentUpdateInput,
  PaginationInput,
  PaginatedResponse,
} from '@/lib/graphql/types';
import {
  GET_PAYMENT_QUERY,
  GET_PAYMENTS_QUERY,
  GET_PAYMENTS_BY_MONTH_QUERY,
} from '@/lib/graphql/queries';
import {
  CREATE_PAYMENT_MUTATION,
  UPDATE_PAYMENT_MUTATION,
  DELETE_PAYMENT_MUTATION,
  APPROVE_PAYMENT_MUTATION,
  REJECT_PAYMENT_MUTATION,
} from '@/lib/graphql/mutations';

interface PaymentsState {
  // Данные
  payments: Payment[];
  currentPayment: Payment | null;
  paginatedData: PaginatedResponse<Payment> | null;
  paymentsByMonth: Array<{ month: string; amount: number }>;
  
  // Состояние
  loading: boolean;
  error: string | null;
  filter: PaymentFilterInput;
  pagination: PaginationInput;
  
  // Действия - основные операции CRUD
  fetchPayment: (id: string) => Promise<Payment | null>;
  fetchPayments: (pagination?: PaginationInput, filter?: PaymentFilterInput) => Promise<void>;
  createPayment: (input: PaymentInput) => Promise<Payment | null>;
  updatePayment: (id: string, input: PaymentUpdateInput) => Promise<Payment | null>;
  deletePayment: (id: string) => Promise<boolean>;
  
  // Действия - специфичные для бизнес-процессов
  approvePayment: (id: string) => Promise<Payment | null>;
  rejectPayment: (id: string, reason: string) => Promise<Payment | null>;
  
  // Действия - аналитика
  fetchPaymentsByMonth: (months: number) => Promise<void>;
  
  // Вспомогательные действия
  setFilter: (filter: PaymentFilterInput) => void;
  setPagination: (pagination: PaginationInput) => void;
  resetFilter: () => void;
  clearPayments: () => void;
  setCurrentPayment: (payment: Payment | null) => void;
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  // Начальное состояние
  payments: [],
  currentPayment: null,
  paginatedData: null,
  paymentsByMonth: [],
  loading: false,
  error: null,
  filter: {},
  pagination: { page: 1, limit: 10 },
  
  // Получение платежа по ID
  fetchPayment: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const { payment } = await graphqlClient.request<{ payment: Payment }>(
        GET_PAYMENT_QUERY,
        { id }
      );
      set({ currentPayment: payment });
      return payment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке платежа';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение списка платежей с пагинацией и фильтрацией
  fetchPayments: async (pagination, filter) => {
    try {
      const currentPagination = pagination || get().pagination;
      const currentFilter = filter || get().filter;
      
      set({ loading: true, error: null });
      
      const { payments } = await graphqlClient.request<{ 
        payments: PaginatedResponse<Payment> 
      }>(
        GET_PAYMENTS_QUERY,
        { 
          pagination: currentPagination,
          filter: currentFilter
        }
      );
      
      set({ 
        payments: payments.items,
        paginatedData: payments,
        pagination: currentPagination,
        filter: currentFilter
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке платежей';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Создание нового платежа
  createPayment: async (input: PaymentInput) => {
    try {
      set({ loading: true, error: null });
      
      const { createPayment } = await graphqlClient.request<{ 
        createPayment: Payment 
      }>(
        CREATE_PAYMENT_MUTATION,
        { input }
      );
      
      // Обновляем кеш после успешного создания
      set(state => ({
        payments: [createPayment, ...state.payments],
        currentPayment: createPayment
      }));
      
      toast.success('Платеж успешно создан');
      return createPayment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании платежа';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Обновление платежа
  updatePayment: async (id: string, input: PaymentUpdateInput) => {
    try {
      set({ loading: true, error: null });
      
      const { updatePayment } = await graphqlClient.request<{ 
        updatePayment: Payment 
      }>(
        UPDATE_PAYMENT_MUTATION,
        { id, input }
      );
      
      // Обновляем данные в локальном состоянии
      set(state => ({
        payments: state.payments.map(p => 
          p.id === id ? { ...p, ...updatePayment } : p
        ),
        currentPayment: state.currentPayment?.id === id 
          ? { ...state.currentPayment, ...updatePayment }
          : state.currentPayment
      }));
      
      toast.success('Платеж успешно обновлен');
      return updatePayment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении платежа';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Удаление платежа
  deletePayment: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { deletePayment } = await graphqlClient.request<{ 
        deletePayment: boolean 
      }>(
        DELETE_PAYMENT_MUTATION,
        { id }
      );
      
      if (deletePayment) {
        // Удаляем платеж из локального состояния
        set(state => ({
          payments: state.payments.filter(p => p.id !== id),
          currentPayment: state.currentPayment?.id === id 
            ? null 
            : state.currentPayment
        }));
        
        toast.success('Платеж успешно удален');
      }
      
      return deletePayment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при удалении платежа';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      set({ loading: false });
    }
  },
  
  // Утверждение платежа
  approvePayment: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { approvePayment } = await graphqlClient.request<{ 
        approvePayment: Payment 
      }>(
        APPROVE_PAYMENT_MUTATION,
        { id }
      );
      
      // Обновляем статус в локальном состоянии
      set(state => ({
        payments: state.payments.map(p => 
          p.id === id ? { ...p, ...approvePayment } : p
        ),
        currentPayment: state.currentPayment?.id === id 
          ? { ...state.currentPayment, ...approvePayment }
          : state.currentPayment
      }));
      
      toast.success('Платеж успешно утвержден');
      return approvePayment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при утверждении платежа';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Отклонение платежа
  rejectPayment: async (id: string, reason: string) => {
    try {
      set({ loading: true, error: null });
      
      const { rejectPayment } = await graphqlClient.request<{ 
        rejectPayment: Payment 
      }>(
        REJECT_PAYMENT_MUTATION,
        { id, reason }
      );
      
      // Обновляем статус в локальном состоянии
      set(state => ({
        payments: state.payments.map(p => 
          p.id === id ? { ...p, ...rejectPayment } : p
        ),
        currentPayment: state.currentPayment?.id === id 
          ? { ...state.currentPayment, ...rejectPayment }
          : state.currentPayment
      }));
      
      toast.success('Платеж отклонен');
      return rejectPayment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при отклонении платежа';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение аналитики платежей по месяцам
  fetchPaymentsByMonth: async (months: number) => {
    try {
      set({ loading: true, error: null });
      
      const { paymentsByMonth } = await graphqlClient.request<{ 
        paymentsByMonth: Array<{ month: string; amount: number }> 
      }>(
        GET_PAYMENTS_BY_MONTH_QUERY,
        { months }
      );
      
      set({ paymentsByMonth });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке аналитики по месяцам';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Установка фильтра
  setFilter: (filter: PaymentFilterInput) => {
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
  
  // Очистка списка платежей
  clearPayments: () => {
    set({ payments: [], paginatedData: null });
  },
  
  // Установка текущего платежа
  setCurrentPayment: (payment: Payment | null) => {
    set({ currentPayment: payment });
  }
}));
