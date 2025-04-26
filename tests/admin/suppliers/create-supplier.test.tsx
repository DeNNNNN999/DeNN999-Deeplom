// tests/admin/suppliers/create-supplier.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateSupplierPage from '@/app/admin/suppliers/create/page';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/auth';
import { toast } from 'sonner';

// Мокаем модули
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
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

// Подготовка моковых данных для тестов
const mockCategories = {
  supplierCategories: {
    items: [
      { id: 'cat1', name: 'Electronics' },
      { id: 'cat2', name: 'Office Supplies' },
    ],
    total: 2,
  },
};

const mockSuccessResponse = {
  createSupplier: {
    id: 'new-supplier-id',
    name: 'Test Company',
    status: 'PENDING',
  },
};

describe('CreateSupplierPage', () => {
  const pushMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockImplementation(() => ({
      push: pushMock,
    }));
    (graphqlClient.request as any).mockImplementation((query: string) => {
      if (query.includes('GetSupplierCategories')) {
        return Promise.resolve(mockCategories);
      }
      if (query.includes('CreateSupplier')) {
        return Promise.resolve(mockSuccessResponse);
      }
      return Promise.resolve({});
    });
  });

  it('renders the form correctly', async () => {
    render(<CreateSupplierPage />);
    
    // Ждем, пока загрузятся категории
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSupplierCategories'),
        expect.any(Object)
      );
    });
    
    // Проверяем заголовок страницы
    expect(screen.getByText('Create New Supplier')).toBeInTheDocument();
    
    // Проверяем наличие основных полей формы
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tax ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registration Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByText(/Categories/i)).toBeInTheDocument();
    
    // Проверяем наличие кнопок
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Supplier')).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    render(<CreateSupplierPage />);
    
    // Ждем, пока загрузятся категории
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSupplierCategories'),
        expect.any(Object)
      );
    });
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Test Company' } });
    fireEvent.change(screen.getByLabelText(/Legal Name/i), { target: { value: 'Test Company LLC' } });
    fireEvent.change(screen.getByLabelText(/Tax ID/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/Registration Number/i), { target: { value: 'REG12345' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Testville' } });
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: 'Testland' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'contact@testcompany.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Contact Person Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Person Email/i), { target: { value: 'john@testcompany.com' } });
    fireEvent.change(screen.getByLabelText(/Contact Person Phone/i), { target: { value: '123-456-7890' } });
    
    // Нажимаем кнопку создания поставщика
    fireEvent.click(screen.getByText('Create Supplier'));
    
    // Проверяем, что GraphQL мутация была вызвана
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('CreateSupplier'),
        expect.any(Object)
      );
    });
    
    // Проверяем, что было показано сообщение об успехе
    expect(toast.success).toHaveBeenCalledWith('Supplier created successfully');
    
    // Проверяем, что произошел редирект на страницу созданного поставщика
    expect(pushMock).toHaveBeenCalledWith('/admin/suppliers/new-supplier-id');
  });

  it('shows validation errors for empty required fields', async () => {
    render(<CreateSupplierPage />);
    
    // Ждем, пока загрузятся категории
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSupplierCategories'),
        expect.any(Object)
      );
    });
    
    // Нажимаем кнопку создания поставщика без заполнения полей
    fireEvent.click(screen.getByText('Create Supplier'));
    
    // Проверяем наличие сообщений об ошибках валидации
    await waitFor(() => {
      expect(screen.getAllByText(/must be at least/i).length).toBeGreaterThan(0);
    });
    
    // Проверяем, что мутация не была вызвана
    expect(graphqlClient.request).not.toHaveBeenCalledWith(
      expect.stringContaining('CreateSupplier'),
      expect.any(Object)
    );
  });

  it('handles API errors correctly', async () => {
    // Настраиваем мок для имитации ошибки API
    (graphqlClient.request as any).mockImplementation((query: string) => {
      if (query.includes('GetSupplierCategories')) {
        return Promise.resolve(mockCategories);
      }
      if (query.includes('CreateSupplier')) {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({});
    });
    
    render(<CreateSupplierPage />);
    
    // Ждем, пока загрузятся категории
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSupplierCategories'),
        expect.any(Object)
      );
    });
    
    // Заполняем минимальный набор обязательных полей
    fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Test Company' } });
    fireEvent.change(screen.getByLabelText(/Legal Name/i), { target: { value: 'Test Company LLC' } });
    fireEvent.change(screen.getByLabelText(/Tax ID/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/Registration Number/i), { target: { value: 'REG12345' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Testville' } });
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: 'Testland' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'contact@testcompany.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Contact Person Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Person Email/i), { target: { value: 'john@testcompany.com' } });
    fireEvent.change(screen.getByLabelText(/Contact Person Phone/i), { target: { value: '123-456-7890' } });
    
    // Нажимаем кнопку создания поставщика
    fireEvent.click(screen.getByText('Create Supplier'));
    
    // Проверяем, что GraphQL мутация была вызвана
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('CreateSupplier'),
        expect.any(Object)
      );
    });
    
    // Проверяем, что было показано сообщение об ошибке
    expect(toast.error).toHaveBeenCalledWith('API Error');
  });

  it('navigates back when cancel button is clicked', async () => {
    render(<CreateSupplierPage />);
    
    // Ждем, пока загрузятся категории
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSupplierCategories'),
        expect.any(Object)
      );
    });
    
    // Нажимаем кнопку отмены
    fireEvent.click(screen.getByText('Cancel'));
    
    // Проверяем, что произошел редирект на страницу списка поставщиков
    expect(pushMock).toHaveBeenCalledWith('/admin/suppliers');
  });
});
