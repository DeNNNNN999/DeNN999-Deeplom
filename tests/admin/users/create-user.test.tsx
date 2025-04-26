// tests/admin/users/create-user.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateUserPage from '@/app/admin/users/create/page';
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
const mockSuccessResponse = {
  createUser: {
    id: 'new-user-id',
    email: 'newuser@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'PROCUREMENT_SPECIALIST',
    isActive: true,
  },
};

describe('CreateUserPage', () => {
  const pushMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockImplementation(() => ({
      push: pushMock,
    }));
    (graphqlClient.request as any).mockImplementation(() => {
      return Promise.resolve(mockSuccessResponse);
    });
  });

  it('renders the form correctly', () => {
    render(<CreateUserPage />);
    
    // Проверяем заголовок страницы
    expect(screen.getByText('Create New User')).toBeInTheDocument();
    
    // Проверяем наличие основных полей формы
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/User Role/i)).toBeInTheDocument();
    expect(screen.getByText(/Department/i)).toBeInTheDocument();
    
    // Проверяем наличие кнопок
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeInTheDocument();
    
    // Проверяем наличие информации о ролях
    expect(screen.getByText(/Administrator:/i)).toBeInTheDocument();
    expect(screen.getByText(/Procurement Manager:/i)).toBeInTheDocument();
    expect(screen.getByText(/Procurement Specialist:/i)).toBeInTheDocument();
    
    // Проверяем наличие информации о безопасности пароля
    expect(screen.getByText(/Password must contain at least 8 characters/i)).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    render(<CreateUserPage />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'SecurePass1!' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    
    // Нажимаем кнопку создания пользователя
    fireEvent.click(screen.getByText('Create User'));
    
    // Проверяем, что GraphQL мутация была вызвана с правильными параметрами
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          input: expect.objectContaining({
            email: 'newuser@example.com',
            password: 'SecurePass1!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'PROCUREMENT_SPECIALIST',
          })
        })
      );
    });
    
    // Проверяем, что было показано сообщение об успехе
    expect(toast.success).toHaveBeenCalledWith('User created successfully');
    
    // Проверяем, что произошел редирект на страницу созданного пользователя
    expect(pushMock).toHaveBeenCalledWith('/admin/users/new-user-id');
  });

  it('shows validation errors for invalid email', async () => {
    render(<CreateUserPage />);
    
    // Вводим неправильный email
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'SecurePass1!' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    
    // Нажимаем кнопку создания пользователя
    fireEvent.click(screen.getByText('Create User'));
    
    // Проверяем сообщение об ошибке валидации
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
    
    // Проверяем, что GraphQL мутация не была вызвана
    expect(graphqlClient.request).not.toHaveBeenCalled();
  });

  it('shows validation errors for weak password', async () => {
    render(<CreateUserPage />);
    
    // Вводим слабый пароль
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    
    // Нажимаем кнопку создания пользователя
    fireEvent.click(screen.getByText('Create User'));
    
    // Проверяем сообщение об ошибке валидации для пароля
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();
    });
    
    // Проверяем, что GraphQL мутация не была вызвана
    expect(graphqlClient.request).not.toHaveBeenCalled();
  });

  it('toggles password visibility when show/hide button is clicked', () => {
    render(<CreateUserPage />);
    
    // Проверяем, что пароль изначально скрыт
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    
    // Нажимаем на кнопку показа пароля
    const toggleButton = screen.getByRole('button', { name: '' }); // Кнопка без текста
    fireEvent.click(toggleButton);
    
    // Проверяем, что пароль стал видимым
    expect(passwordInput.type).toBe('text');
    
    // Нажимаем на кнопку еще раз
    fireEvent.click(toggleButton);
    
    // Проверяем, что пароль снова скрыт
    expect(passwordInput.type).toBe('password');
  });

  it('handles API errors correctly', async () => {
    // Настраиваем мок для имитации ошибки API
    (graphqlClient.request as any).mockImplementation(() => {
      return Promise.reject(new Error('Email already exists'));
    });
    
    render(<CreateUserPage />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'SecurePass1!' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    
    // Нажимаем кнопку создания пользователя
    fireEvent.click(screen.getByText('Create User'));
    
    // Проверяем, что GraphQL мутация была вызвана
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalled();
    });
    
    // Проверяем, что было показано сообщение об ошибке
    expect(toast.error).toHaveBeenCalledWith('Email already exists');
  });

  it('navigates back when cancel button is clicked', () => {
    render(<CreateUserPage />);
    
    // Нажимаем кнопку отмены
    fireEvent.click(screen.getByText('Cancel'));
    
    // Проверяем, что произошел редирект на страницу списка пользователей
    expect(pushMock).toHaveBeenCalledWith('/admin/users');
  });
});
