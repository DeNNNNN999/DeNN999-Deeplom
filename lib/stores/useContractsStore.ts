import { create } from 'zustand';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import {
  Contract,
  ContractFilterInput,
  ContractInput,
  ContractUpdateInput,
  PaginationInput,
  PaginatedResponse,
  ContractExpirationSummary,
} from '@/lib/graphql/types';
import {
  GET_CONTRACT_QUERY,
  GET_CONTRACTS_QUERY,
  GET_EXPIRING_CONTRACTS_QUERY,
  GET_CONTRACT_EXPIRATION_SUMMARY,
  GET_CONTRACTS_BY_STATUS_QUERY,
} from '@/lib/graphql/queries';
import {
  CREATE_CONTRACT_MUTATION,
  UPDATE_CONTRACT_MUTATION,
  DELETE_CONTRACT_MUTATION,
  APPROVE_CONTRACT_MUTATION,
  REJECT_CONTRACT_MUTATION,
} from '@/lib/graphql/mutations';

interface ContractsState {
  // Данные
  contracts: Contract[];
  currentContract: Contract | null;
  paginatedData: PaginatedResponse<Contract> | null;
  expirationSummary: ContractExpirationSummary | null;
  contractsByStatus: Array<{ status: string; count: number; value: number }>;
  
  // Состояние
  loading: boolean;
  error: string | null;
  filter: ContractFilterInput;
  pagination: PaginationInput;
  
  // Действия - основные операции CRUD
  fetchContract: (id: string) => Promise<Contract | null>;
  fetchContracts: (pagination?: PaginationInput, filter?: ContractFilterInput) => Promise<void>;
  fetchExpiringContracts: (daysThreshold?: number, pagination?: PaginationInput) => Promise<void>;
  createContract: (input: ContractInput) => Promise<Contract | null>;
  updateContract: (id: string, input: ContractUpdateInput) => Promise<Contract | null>;
  deleteContract: (id: string) => Promise<boolean>;
  
  // Действия - специфичные для бизнес-процессов
  approveContract: (id: string) => Promise<Contract | null>;
  rejectContract: (id: string, reason: string) => Promise<Contract | null>;
  
  // Действия - аналитика
  fetchExpirationSummary: () => Promise<void>;
  fetchContractsByStatus: () => Promise<void>;
  
  // Вспомогательные действия
  setFilter: (filter: ContractFilterInput) => void;
  setPagination: (pagination: PaginationInput) => void;
  resetFilter: () => void;
  clearContracts: () => void;
  setCurrentContract: (contract: Contract | null) => void;
}

export const useContractsStore = create<ContractsState>((set, get) => ({
  // Начальное состояние
  contracts: [],
  currentContract: null,
  paginatedData: null,
  expirationSummary: null,
  contractsByStatus: [],
  loading: false,
  error: null,
  filter: {},
  pagination: { page: 1, limit: 10 },
  
  // Получение контракта по ID
  fetchContract: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const { contract } = await graphqlClient.request<{ contract: Contract }>(
        GET_CONTRACT_QUERY,
        { id }
      );
      set({ currentContract: contract });
      return contract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке контракта';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение списка контрактов с пагинацией и фильтрацией
  fetchContracts: async (pagination, filter) => {
    try {
      const currentPagination = pagination || get().pagination;
      const currentFilter = filter || get().filter;
      
      set({ loading: true, error: null });
      
      const { contracts } = await graphqlClient.request<{ 
        contracts: PaginatedResponse<Contract> 
      }>(
        GET_CONTRACTS_QUERY,
        { 
          pagination: currentPagination,
          filter: currentFilter
        }
      );
      
      set({ 
        contracts: contracts.items,
        paginatedData: contracts,
        pagination: currentPagination,
        filter: currentFilter
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке контрактов';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение истекающих контрактов
  fetchExpiringContracts: async (daysThreshold = 30, pagination) => {
    try {
      const currentPagination = pagination || get().pagination;
      
      set({ loading: true, error: null });
      
      const { expiringContracts } = await graphqlClient.request<{ 
        expiringContracts: PaginatedResponse<Contract> 
      }>(
        GET_EXPIRING_CONTRACTS_QUERY,
        { 
          daysThreshold,
          pagination: currentPagination
        }
      );
      
      set({ 
        contracts: expiringContracts.items,
        paginatedData: expiringContracts,
        pagination: currentPagination
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке истекающих контрактов';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Создание нового контракта
  createContract: async (input: ContractInput) => {
    try {
      set({ loading: true, error: null });
      
      const { createContract } = await graphqlClient.request<{ 
        createContract: Contract 
      }>(
        CREATE_CONTRACT_MUTATION,
        { input }
      );
      
      // Обновляем кеш после успешного создания
      set(state => ({
        contracts: [createContract, ...state.contracts],
        currentContract: createContract
      }));
      
      toast.success('Контракт успешно создан');
      return createContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании контракта';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Обновление контракта
  updateContract: async (id: string, input: ContractUpdateInput) => {
    try {
      set({ loading: true, error: null });
      
      const { updateContract } = await graphqlClient.request<{ 
        updateContract: Contract 
      }>(
        UPDATE_CONTRACT_MUTATION,
        { id, input }
      );
      
      // Обновляем данные в локальном состоянии
      set(state => ({
        contracts: state.contracts.map(c => 
          c.id === id ? { ...c, ...updateContract } : c
        ),
        currentContract: state.currentContract?.id === id 
          ? { ...state.currentContract, ...updateContract }
          : state.currentContract
      }));
      
      toast.success('Контракт успешно обновлен');
      return updateContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении контракта';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Удаление контракта
  deleteContract: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { deleteContract } = await graphqlClient.request<{ 
        deleteContract: boolean 
      }>(
        DELETE_CONTRACT_MUTATION,
        { id }
      );
      
      if (deleteContract) {
        // Удаляем контракт из локального состояния
        set(state => ({
          contracts: state.contracts.filter(c => c.id !== id),
          currentContract: state.currentContract?.id === id 
            ? null 
            : state.currentContract
        }));
        
        toast.success('Контракт успешно удален');
      }
      
      return deleteContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при удалении контракта';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return false;
    } finally {
      set({ loading: false });
    }
  },
  
  // Утверждение контракта
  approveContract: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { approveContract } = await graphqlClient.request<{ 
        approveContract: Contract 
      }>(
        APPROVE_CONTRACT_MUTATION,
        { id }
      );
      
      // Обновляем статус в локальном состоянии
      set(state => ({
        contracts: state.contracts.map(c => 
          c.id === id ? { ...c, ...approveContract } : c
        ),
        currentContract: state.currentContract?.id === id 
          ? { ...state.currentContract, ...approveContract }
          : state.currentContract
      }));
      
      toast.success('Контракт успешно утвержден');
      return approveContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при утверждении контракта';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Отклонение контракта
  rejectContract: async (id: string, reason: string) => {
    try {
      set({ loading: true, error: null });
      
      const { rejectContract } = await graphqlClient.request<{ 
        rejectContract: Contract 
      }>(
        REJECT_CONTRACT_MUTATION,
        { id, reason }
      );
      
      // Обновляем статус в локальном состоянии
      set(state => ({
        contracts: state.contracts.map(c => 
          c.id === id ? { ...c, ...rejectContract } : c
        ),
        currentContract: state.currentContract?.id === id 
          ? { ...state.currentContract, ...rejectContract }
          : state.currentContract
      }));
      
      toast.success('Контракт отклонен');
      return rejectContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при отклонении контракта';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение сводки по истекающим контрактам
  fetchExpirationSummary: async () => {
    try {
      set({ loading: true, error: null });
      
      const { contractExpirationSummary } = await graphqlClient.request<{ 
        contractExpirationSummary: ContractExpirationSummary 
      }>(
        GET_CONTRACT_EXPIRATION_SUMMARY
      );
      
      set({ expirationSummary: contractExpirationSummary });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке сводки истекающих контрактов';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Получение аналитики контрактов по статусам
  fetchContractsByStatus: async () => {
    try {
      set({ loading: true, error: null });
      
      const { contractsByStatus } = await graphqlClient.request<{ 
        contractsByStatus: Array<{ status: string; count: number; value: number }> 
      }>(
        GET_CONTRACTS_BY_STATUS_QUERY
      );
      
      set({ contractsByStatus });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке аналитики по статусам';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
  
  // Установка фильтра
  setFilter: (filter: ContractFilterInput) => {
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
  
  // Очистка списка контрактов
  clearContracts: () => {
    set({ contracts: [], paginatedData: null });
  },
  
  // Установка текущего контракта
  setCurrentContract: (contract: Contract | null) => {
    set({ currentContract: contract });
  }
}));
