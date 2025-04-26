// tests/admin/contracts/create-contract.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateContractPage from '@/app/admin/contracts/create/page';
import { useRouter, useSearchParams } from 'next/navigation';
import { graphqlClient } from '@/lib/auth';
import { toast } from 'sonner';
import * as dateFns from 'date-fns';

// Мокаем модули
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

vi.mock('@/lib/auth', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
  getCurrentUser: vi.fn(() => ({
    id: 'test-user-id',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar-component">Calendar Mock</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Подготовка моковых данных для тестов
const mockSuppliers = {
  suppliers: {
    items: [
      { id: 'supplier-1', name: 'Supplier 1', email: 'supplier1@example.com', status: 'APPROVED' },
      { id: 'supplier-2', name: 'Supplier 2', email: 'supplier2@example.com', status: 'APPROVED' },
    ],
    total: 2,
    page: 1,
    limit: 10,
    hasMore: false,
  },
};

const mockSuccessResponse = {
  createContract: {
    id: 'new-contract-id',
    title: 'Test Contract',
    status: 'DRAFT',
  },
};

describe('CreateContractPage', () => {
  const pushMock = vi.fn();
  const getParamMock = vi.fn().mockReturnValue(null);
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockImplementation(() => ({
      push: pushMock,
    }));
    (useSearchParams as any).mockImplementation(() => ({
      get: getParamMock,
    }));
    (graphqlClient.request as any).mockImplementation((query: string) => {
      if (query.includes('GetSuppliers')) {
        return Promise.resolve(mockSuppliers);
      }
      if (query.includes('CreateContract')) {
        return Promise.resolve(mockSuccessResponse);
      }
      return Promise.resolve({});
    });
  });

  it('renders the form correctly', async () => {
    render(<CreateContractPage />);
    
    // Ждем, пока загрузятся поставщики
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pagination: expect.anything(),
          filter: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });
    
    // Проверяем заголовок страницы
    expect(screen.getByText('Create New Contract')).toBeInTheDocument();
    
    // Проверяем наличие основных полей формы
    expect(screen.getByLabelText(/Contract Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contract Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Supplier/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contract Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contract Terms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payment Terms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery Terms/i)).toBeInTheDocument();
    
    // Проверяем наличие кнопок
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Contract')).toBeInTheDocument();
  });

  it('handles pre-filled supplierId from URL query param', async () => {
    // Настраиваем мок для имитации наличия supplierId в URL
    getParamMock.mockReturnValue('supplier-1');
    
    render(<CreateContractPage />);
    
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pagination: expect.anything(),
          filter: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });
    
    // Проверяем, что supplierId был запрошен из URL параметров
    expect(getParamMock).toHaveBeenCalledWith('supplierId');
  });

  it('submits the form with valid data', async () => {
    render(<CreateContractPage />);
    
    // Ждем, пока загрузятся поставщики
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pagination: expect.anything(),
          filter: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/Contract Title/i), { target: { value: 'Test Contract' } });
    fireEvent.change(screen.getByLabelText(/Contract Number/i), { target: { value: 'CNT-2025-001' } });
    fireEvent.change(screen.getByLabelText(/Contract Value/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test contract description' } });
    
    // Нажимаем кнопку создания контракта
    fireEvent.click(screen.getByText('Create Contract'));
    
    // Проверяем, что GraphQL мутация была вызвана
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            title: 'Test Contract',
            contractNumber: 'CNT-2025-001',
            value: 10000,
            description: 'Test contract description',
          })
        })
      );
    });
    
    // Проверяем, что было показано сообщение об успехе
    expect(toast.success).toHaveBeenCalledWith('Contract created successfully');
    
    // Проверяем, что произошел редирект на страницу созданного контракта
    expect(pushMock).toHaveBeenCalledWith('/admin/contracts/new-contract-id');
  });

  it('shows validation errors for empty required fields', async () => {
    render(<CreateContractPage />);
    
    // Ждем, пока загрузятся поставщики
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pagination: expect.anything(),
          filter: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });
    
    // Нажимаем кнопку создания контракта без заполнения полей
    fireEvent.click(screen.getByText('Create Contract'));
    
    // Проверяем наличие сообщений об ошибках валидации
    await waitFor(() => {
      expect(screen.queryByText(/Title must be at least/i)).toBeInTheDocument();
      expect(screen.queryByText(/Contract number must be at least/i)).toBeInTheDocument();
    });
  });

  it('handles API errors correctly', async () => {
    // Настраиваем мок для имитации ошибки API
    (graphqlClient.request as any).mockImplementation((query: string) => {
      if (query.includes('GetSuppliers')) {
        return Promise.resolve(mockSuppliers);
      }
      if (query.includes('CreateContract')) {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({});
    });
    
    render(<CreateContractPage />);
    
    // Ждем, пока загрузятся поставщики
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pagination: expect.anything(),
          filter: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/Contract Title/i), { target: { value: 'Test Contract' } });
    fireEvent.change(screen.getByLabelText(/Contract Number/i), { target: { value: 'CNT-2025-001' } });
    fireEvent.change(screen.getByLabelText(/Contract Value/i), { target: { value: '10000' } });
    
    // Нажимаем кнопку создания контракта
    fireEvent.click(screen.getByText('Create Contract'));
    
    // Проверяем, что был вызван метод request, но возникла ошибка
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            title: 'Test Contract',
            contractNumber: 'CNT-2025-001',
            value: 10000,
          })
        })
      );
      
      // Проверяем, что было показано сообщение об ошибке
      expect(toast.error).toHaveBeenCalledWith('API Error');
    });
  });

  it('navigates back when cancel button is clicked', async () => {
    render(<CreateContractPage />);
    
    // Ждем, пока загрузятся поставщики
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything()
      );
    });
    
    // Нажимаем кнопку отмены
    fireEvent.click(screen.getByText('Cancel'));
    
    // Проверяем, что произошел редирект на страницу списка контрактов
    expect(pushMock).toHaveBeenCalledWith('/admin/contracts');
  });
});
