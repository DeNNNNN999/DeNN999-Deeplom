import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import {
  GET_CONTRACT_QUERY,
  GET_CONTRACTS_QUERY,
  GET_EXPIRING_CONTRACTS_QUERY,
  GET_CONTRACT_EXPIRATION_SUMMARY,
  CREATE_CONTRACT_MUTATION,
  UPDATE_CONTRACT_MUTATION,
  DELETE_CONTRACT_MUTATION,
  APPROVE_CONTRACT_MUTATION,
  REJECT_CONTRACT_MUTATION
} from '@/lib/graphql/queries';
import {
  Contract,
  ContractInput,
  ContractUpdateInput,
  ContractFilterInput,
  ContractExpirationSummary,
  PaginationInput,
  PaginatedResponse
} from '@/lib/graphql/types';

interface UseContractsProps {
  id?: string;
  pagination?: PaginationInput;
  filter?: ContractFilterInput;
  expiringOnly?: boolean;
  expirationDays?: number;
}

interface UseContractsReturn {
  contract: Contract | null;
  contracts: Contract[];
  expiringContracts: Contract[] | null;
  contractExpirationSummary: ContractExpirationSummary | null;
  paginatedData: PaginatedResponse<Contract> | null;
  loading: boolean;
  error: Error | null;
  fetchContract: (id: string) => Promise<Contract | null>;
  fetchContracts: (pagination?: PaginationInput, filter?: ContractFilterInput) => Promise<void>;
  fetchExpiringContracts: (daysThreshold?: number, pagination?: PaginationInput) => Promise<void>;
  fetchContractExpirationSummary: () => Promise<ContractExpirationSummary | null>;
  createContract: (input: ContractInput) => Promise<Contract | null>;
  updateContract: (id: string, input: ContractUpdateInput) => Promise<Contract | null>;
  deleteContract: (id: string) => Promise<boolean>;
  approveContract: (id: string) => Promise<Contract | null>;
  rejectContract: (id: string, reason: string) => Promise<Contract | null>;
}

export const useContracts = ({
  id,
  pagination = { page: 1, limit: 10 },
  filter,
  expiringOnly = false,
  expirationDays = 30
}: UseContractsProps = {}): UseContractsReturn => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<Contract[] | null>(null);
  const [contractExpirationSummary, setContractExpirationSummary] = useState<ContractExpirationSummary | null>(null);
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<Contract> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContract = useCallback(async (contractId: string): Promise<Contract | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { contract } = await graphqlClient.request<{ contract: Contract }>(
        GET_CONTRACT_QUERY,
        { id: contractId }
      );
      
      setContract(contract);
      return contract;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке контракта');
      setError(error);
      console.error('Error fetching contract:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContracts = useCallback(async (
    newPagination?: PaginationInput,
    newFilter?: ContractFilterInput
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const { contracts } = await graphqlClient.request<{ contracts: PaginatedResponse<Contract> }>(
        GET_CONTRACTS_QUERY,
        { 
          pagination: newPagination || pagination,
          filter: newFilter || filter
        }
      );
      
      setContracts(contracts.items);
      setPaginatedData(contracts);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке контрактов');
      setError(error);
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination, filter]);

  const fetchExpiringContracts = useCallback(async (
    daysThreshold: number = expirationDays,
    newPagination: PaginationInput = pagination
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const { expiringContracts } = await graphqlClient.request<{ 
        expiringContracts: PaginatedResponse<Contract> 
      }>(
        GET_EXPIRING_CONTRACTS_QUERY,
        { 
          daysThreshold,
          pagination: newPagination
        }
      );
      
      setExpiringContracts(expiringContracts.items);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке истекающих контрактов');
      setError(error);
      console.error('Error fetching expiring contracts:', error);
    } finally {
      setLoading(false);
    }
  }, [expirationDays, pagination]);

  const fetchContractExpirationSummary = useCallback(async (): Promise<ContractExpirationSummary | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { contractExpirationSummary } = await graphqlClient.request<{ 
        contractExpirationSummary: ContractExpirationSummary 
      }>(
        GET_CONTRACT_EXPIRATION_SUMMARY
      );
      
      setContractExpirationSummary(contractExpirationSummary);
      return contractExpirationSummary;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке сводки истекающих контрактов');
      setError(error);
      console.error('Error fetching contract expiration summary:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createContract = useCallback(async (input: ContractInput): Promise<Contract | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { createContract } = await graphqlClient.request<{ createContract: Contract }>(
        CREATE_CONTRACT_MUTATION,
        { input }
      );
      
      toast.success('Контракт успешно создан');
      return createContract;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при создании контракта');
      setError(error);
      console.error('Error creating contract:', error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContract = useCallback(async (
    contractId: string,
    input: ContractUpdateInput
  ): Promise<Contract | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { updateContract } = await graphqlClient.request<{ updateContract: Contract }>(
        UPDATE_CONTRACT_MUTATION,
        { id: contractId, input }
      );
      
      // Обновляем локальное состояние, если обновляем текущий просматриваемый контракт
      if (contract && contract.id === contractId) {
        setContract(prevContract => prevContract ? { ...prevContract, ...updateContract } : null);
      }
      
      toast.success('Контракт успешно обновлен');
      return updateContract;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при обновлении контракта');
      setError(error);
      console.error('Error updating contract:', error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const deleteContract = useCallback(async (contractId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const { deleteContract } = await graphqlClient.request<{ deleteContract: boolean }>(
        DELETE_CONTRACT_MUTATION,
        { id: contractId }
      );
      
      if (deleteContract) {
        // Обновляем локальное состояние
        if (contract && contract.id === contractId) {
          setContract(null);
        }
        
        setContracts(prevContracts => prevContracts.filter(c => c.id !== contractId));
        
        toast.success('Контракт успешно удален');
      }
      
      return deleteContract;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при удалении контракта');
      setError(error);
      console.error('Error deleting contract:', error);
      toast.error(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const approveContract = useCallback(async (contractId: string): Promise<Contract | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { approveContract } = await graphqlClient.request<{ approveContract: Contract }>(
        APPROVE_CONTRACT_MUTATION,
        { id: contractId }
      );
      
      // Обновляем локальное состояние
      if (contract && contract.id === contractId) {
        setContract(prevContract => prevContract ? { ...prevContract, ...approveContract } : null);
      }
      
      setContracts(prevContracts => 
        prevContracts.map(c => c.id === contractId ? { ...c, status: approveContract.status } : c)
      );
      
      toast.success('Контракт успешно утвержден');
      return approveContract;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при утверждении контракта');
      setError(error);
      console.error('Error approving contract:', error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const rejectContract = useCallback(async (
    contractId: string,
    reason: string
  ): Promise<Contract | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { rejectContract } = await graphqlClient.request<{ rejectContract: Contract }>(
        REJECT_CONTRACT_MUTATION,
        { id: contractId, reason }
      );
      
      // Обновляем локальное состояние
      if (contract && contract.id === contractId) {
        setContract(prevContract => prevContract ? { ...prevContract, ...rejectContract } : null);
      }
      
      setContracts(prevContracts => 
        prevContracts.map(c => c.id === contractId ? { ...c, status: rejectContract.status } : c)
      );
      
      toast.success('Контракт отклонен');
      return rejectContract;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при отклонении контракта');
      setError(error);
      console.error('Error rejecting contract:', error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    if (id) {
      fetchContract(id);
    } else if (expiringOnly) {
      fetchExpiringContracts();
      fetchContractExpirationSummary();
    } else {
      fetchContracts();
    }
  }, [id, expiringOnly, fetchContract, fetchContracts, fetchExpiringContracts, fetchContractExpirationSummary]);

  return {
    contract,
    contracts,
    expiringContracts,
    contractExpirationSummary,
    paginatedData,
    loading,
    error,
    fetchContract,
    fetchContracts,
    fetchExpiringContracts,
    fetchContractExpirationSummary,
    createContract,
    updateContract,
    deleteContract,
    approveContract,
    rejectContract
  };
};
