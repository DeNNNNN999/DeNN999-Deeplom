// tests/admin/settings/settings.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/admin/settings/page';
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
const mockSystemSettings = {
  systemSettings: {
    items: [
      {
        id: 'setting-1',
        key: 'company_name',
        value: 'Test Company',
        description: 'Company name used in reports and invoices',
        dataType: 'string',
        isPublic: true,
        updatedBy: null,
        createdAt: '2025-04-10T12:00:00Z',
        updatedAt: '2025-04-10T12:00:00Z',
      },
      {
        id: 'setting-2',
        key: 'invoice_prefix',
        value: 'INV',
        description: 'Prefix for invoice numbers',
        dataType: 'string',
        isPublic: false,
        updatedBy: null,
        createdAt: '2025-04-10T12:00:00Z',
        updatedAt: '2025-04-10T12:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 10,
    hasMore: false,
  },
};

const mockBackupSettings = {
  backupSettings: {
    backup_enabled: true,
    backup_frequency: 'daily',
    backup_retention_days: 30,
    backup_storage_location: '/backups',
    backup_email_notification: true,
    backup_notification_email: 'admin@example.com',
  },
};

const mockSystemStats = {
  systemStatistics: {
    users: {
      totalUsers: 10,
      activeUsers: 8,
      admins: 2,
      managers: 3,
      specialists: 5,
    },
    auditLogs: {
      totalLogs: 500,
      lastDay: 50,
      lastWeek: 200,
      lastMonth: 500,
    },
    permissions: {
      totalPerms: 30,
      granted: 25,
      denied: 5,
    },
    settings: {
      totalSettings: 15,
      publicSettings: 8,
    },
    timestamp: '2025-04-20T12:00:00Z',
  },
};

const mockDatabaseStats = {
  databaseStatistics: [
    {
      tableName: 'users',
      rowCount: 15,
      totalSizeBytes: 204800,
      totalSize: '200 KB',
    },
    {
      tableName: 'suppliers',
      rowCount: 25,
      totalSizeBytes: 307200,
      totalSize: '300 KB',
    },
  ],
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Настраиваем моки для разных запросов
    (graphqlClient.request as any).mockImplementation((query: string) => {
      if (query.includes('GetSystemSettings')) {
        return Promise.resolve(mockSystemSettings);
      }
      if (query.includes('GetBackupSettings')) {
        return Promise.resolve(mockBackupSettings);
      }
      if (query.includes('GetSystemStatistics')) {
        return Promise.resolve(mockSystemStats);
      }
      if (query.includes('GetDatabaseStatistics')) {
        return Promise.resolve(mockDatabaseStats);
      }
      if (query.includes('CreateSystemSetting')) {
        return Promise.resolve({
          createSystemSetting: {
            id: 'new-setting-id',
            key: 'new_setting',
            value: 'test value',
          },
        });
      }
      if (query.includes('UpdateSystemSetting')) {
        return Promise.resolve({
          updateSystemSetting: {
            id: 'setting-1',
            key: 'company_name',
            value: 'Updated Company',
          },
        });
      }
      if (query.includes('DeleteSystemSetting')) {
        return Promise.resolve({
          deleteSystemSetting: true,
        });
      }
      if (query.includes('ConfigureBackupSettings')) {
        return Promise.resolve({
          configureBackupSettings: {
            success: true,
            message: 'Backup settings updated successfully',
          },
        });
      }
      return Promise.resolve({});
    });
  });

  it('renders the settings page with tabs', async () => {
    render(<SettingsPage />);
    
    // Проверяем заголовок
    expect(screen.getByText('System Settings')).toBeInTheDocument();
    
    // Проверяем наличие вкладок
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Backup')).toBeInTheDocument();
    expect(screen.getByText('System Info')).toBeInTheDocument();
    
    // Ожидаем загрузку данных
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
  });

  it('loads and displays system settings', async () => {
    render(<SettingsPage />);
    
    // Ожидаем загрузку настроек
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
    
    // Проверяем отображение настроек
    await waitFor(() => {
      expect(screen.getByText('company_name')).toBeInTheDocument();
      expect(screen.getByText('invoice_prefix')).toBeInTheDocument();
    });
  });

  it('shows the new setting form when Add Setting button is clicked', async () => {
    render(<SettingsPage />);
    
    // Ожидаем загрузку настроек
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
    
    // Нажимаем кнопку добавления новой настройки
    const addButton = screen.getByText('Add Setting');
    fireEvent.click(addButton);
    
    // Проверяем отображение формы
    expect(screen.getByText('Add New Setting')).toBeInTheDocument();
    expect(screen.getByLabelText(/Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Public Setting/i)).toBeInTheDocument();
  });

  it('submits the new setting form', async () => {
    render(<SettingsPage />);
    
    // Ожидаем загрузку настроек
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
    
    // Нажимаем кнопку добавления новой настройки
    const addButton = screen.getByText('Add Setting');
    fireEvent.click(addButton);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/Key/i), { target: { value: 'new_setting' } });
    fireEvent.change(screen.getByLabelText(/Value/i), { target: { value: 'test value' } });
    
    // Отправляем форму
    const saveButton = screen.getByText('Save Setting');
    fireEvent.click(saveButton);
    
    // Проверяем, что мутация была вызвана
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('CreateSystemSetting'),
        expect.objectContaining({
          input: expect.objectContaining({
            key: 'new_setting',
            value: 'test value',
          }),
        })
      );
    });
    
    // Проверяем показ уведомления
    expect(toast.success).toHaveBeenCalledWith('Setting created successfully');
  });

  it('switches to backup tab and shows backup settings', async () => {
    render(<SettingsPage />);
    
    // Ожидаем загрузку данных
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
    
    // Переключаемся на вкладку Backup
    const backupTab = screen.getByText('Backup');
    fireEvent.click(backupTab);
    
    // Проверяем загрузку настроек резервного копирования
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetBackupSettings'),
        expect.anything()
      );
    });
    
    // Проверяем отображение формы резервного копирования
    expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    expect(screen.getByText('Enable Automated Backups')).toBeInTheDocument();
    expect(screen.getByText('Backup Frequency')).toBeInTheDocument();
    expect(screen.getByText('Retention Period (days)')).toBeInTheDocument();
  });

  it('switches to system info tab and shows statistics', async () => {
    render(<SettingsPage />);
    
    // Ожидаем загрузку данных
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
    
    // Переключаемся на вкладку System Info
    const systemTab = screen.getByText('System Info');
    fireEvent.click(systemTab);
    
    // Проверяем загрузку системной статистики
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemStatistics'),
        expect.anything()
      );
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetDatabaseStatistics'),
        expect.anything()
      );
    });
    
    // Проверяем отображение статистики
    await waitFor(() => {
      expect(screen.getByText('System Information')).toBeInTheDocument();
      expect(screen.getByText('Database Statistics')).toBeInTheDocument();
      expect(screen.getByText('User Statistics')).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(<SettingsPage />);
    
    // Ожидаем загрузку данных
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
    });
    
    // Сбрасываем моки для проверки повторного вызова
    vi.clearAllMocks();
    
    // Нажимаем кнопку обновления
    const refreshButton = screen.getByText('Refresh Data');
    fireEvent.click(refreshButton);
    
    // Проверяем повторную загрузку данных
    await waitFor(() => {
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemSettings'),
        expect.anything()
      );
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetBackupSettings'),
        expect.anything()
      );
      expect(graphqlClient.request).toHaveBeenCalledWith(
        expect.stringContaining('GetSystemStatistics'),
        expect.anything()
      );
    });
    
    // Проверяем показ уведомления
    expect(toast.success).toHaveBeenCalledWith('Data refreshed');
  });
});
