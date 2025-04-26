'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/auth';
import { 
  GET_SYSTEM_SETTINGS_QUERY, 
  GET_BACKUP_SETTINGS_QUERY,
  GET_SYSTEM_STATISTICS_QUERY,
  GET_DATABASE_STATISTICS_QUERY
} from '@/lib/graphql/queries';
import { 
  CREATE_SYSTEM_SETTING_MUTATION, 
  UPDATE_SYSTEM_SETTING_MUTATION, 
  DELETE_SYSTEM_SETTING_MUTATION,
  CONFIGURE_BACKUP_SETTINGS_MUTATION
} from '@/lib/graphql/mutations';
import { 
  Save, 
  Loader, 
  PlusCircle, 
  Trash2, 
  Database, 
  Server, 
  Settings, 
  Clock, 
  Mail,
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck,
  ArrowUpDown,
  Users
} from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';

// Типы данных
type SystemSetting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  dataType: string;
  isPublic: boolean;
  updatedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type BackupSettings = {
  backup_enabled: boolean;
  backup_frequency: string;
  backup_retention_days: number;
  backup_storage_location: string;
  backup_email_notification: boolean;
  backup_notification_email: string;
};

type SystemStatistics = {
  users: {
    totalUsers: number;
    activeUsers: number;
    admins: number;
    managers: number;
    specialists: number;
  };
  auditLogs: {
    totalLogs: number;
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  };
  permissions: {
    totalPerms: number;
    granted: number;
    denied: number;
  };
  settings: {
    totalSettings: number;
    publicSettings: number;
  };
  timestamp: string;
};

type DatabaseStatistic = {
  tableName: string;
  rowCount: number;
  totalSizeBytes: number;
  totalSize: string;
};

// Схемы валидации
const systemSettingSchema = z.object({
  key: z.string().min(1, { message: 'Key is required' }).regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Key can only contain letters, numbers, and underscores',
  }),
  value: z.string().min(1, { message: 'Value is required' }),
  description: z.string().optional(),
  dataType: z.enum(['string', 'number', 'boolean', 'json']),
  isPublic: z.boolean(),
});

const backupSettingsSchema = z.object({
  backup_enabled: z.boolean(),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly']),
  backup_retention_days: z.number().int().min(1).max(365),
  backup_storage_location: z.string().min(1, { message: 'Storage location is required' }),
  backup_email_notification: z.boolean(),
  backup_notification_email: z.string().email().optional().or(z.literal('')),
});

type SystemSettingFormValues = z.infer<typeof systemSettingSchema>;
type BackupSettingsFormValues = z.infer<typeof backupSettingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStatistics | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStatistic[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingBackup, setLoadingBackup] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isSubmittingNewSetting, setIsSubmittingNewSetting] = useState(false);
  const [isSubmittingBackup, setIsSubmittingBackup] = useState(false);
  const [showNewSettingForm, setShowNewSettingForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null);

  // Формы
  const {
    register: registerNewSetting,
    handleSubmit: handleSubmitNewSetting,
    reset: resetNewSetting,
    control: controlNewSetting,
    formState: { errors: errorsNewSetting },
  } = useForm<SystemSettingFormValues>({
    resolver: zodResolver(systemSettingSchema),
    defaultValues: {
      dataType: 'string',
      isPublic: false,
    },
  });

  const {
    register: registerBackup,
    handleSubmit: handleSubmitBackup,
    control: controlBackup,
    setValue: setValueBackup,
    formState: { errors: errorsBackup },
  } = useForm<BackupSettingsFormValues>({
    resolver: zodResolver(backupSettingsSchema),
    defaultValues: {
      backup_enabled: false,
      backup_frequency: 'daily',
      backup_retention_days: 30,
      backup_storage_location: '/backups',
      backup_email_notification: false,
      backup_notification_email: '',
    },
  });

  // Загрузка данных
  useEffect(() => {
    fetchSystemSettings();
    fetchBackupSettings();
    fetchSystemStats();
  }, []);

  const fetchSystemSettings = async (page = 1, search = '') => {
    setLoadingSettings(true);
    try {
      const variables = {
        pagination: { page, limit: 10 },
        search: search || undefined,
      };
      
      const response = await graphqlClient.request(GET_SYSTEM_SETTINGS_QUERY, variables);
      
      if (response && response.systemSettings) {
        setSystemSettings(response.systemSettings.items || []);
        setTotalPages(Math.ceil((response.systemSettings.total || 0) / 10));
        setCurrentPage(response.systemSettings.page || 1);
      }
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchBackupSettings = async () => {
    setLoadingBackup(true);
    try {
      const response = await graphqlClient.request(GET_BACKUP_SETTINGS_QUERY);
      
      if (response && response.backupSettings) {
        setBackupSettings(response.backupSettings);
        
        // Заполняем форму полученными данными
        Object.entries(response.backupSettings).forEach(([key, value]) => {
          setValueBackup(key as keyof BackupSettingsFormValues, value as any);
        });
      }
    } catch (error: any) {
      console.error('Error fetching backup settings:', error);
      toast.error('Failed to load backup settings');
    } finally {
      setLoadingBackup(false);
    }
  };

  const fetchSystemStats = async () => {
    setLoadingStats(true);
    try {
      // Загрузка статистики системы
      const systemResponse = await graphqlClient.request(GET_SYSTEM_STATISTICS_QUERY);
      if (systemResponse && systemResponse.systemStatistics) {
        setSystemStats(systemResponse.systemStatistics);
      }
      
      // Загрузка статистики базы данных
      const dbResponse = await graphqlClient.request(GET_DATABASE_STATISTICS_QUERY);
      if (dbResponse && dbResponse.databaseStatistics) {
        setDatabaseStats(dbResponse.databaseStatistics);
      }
    } catch (error: any) {
      console.error('Error fetching system statistics:', error);
      toast.error('Failed to load system statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  // Обработчики форм
  const onSubmitNewSetting = async (data: SystemSettingFormValues) => {
    setIsSubmittingNewSetting(true);
    try {
      if (editingSettingId) {
        // Обновление существующей настройки
        const { key, ...updateData } = data; // Исключаем ключ, так как его нельзя изменить
        const response = await graphqlClient.request(UPDATE_SYSTEM_SETTING_MUTATION, {
          id: editingSettingId,
          input: updateData,
        });
        
        toast.success('Setting updated successfully');
      } else {
        // Создание новой настройки
        const response = await graphqlClient.request(CREATE_SYSTEM_SETTING_MUTATION, {
          input: data,
        });
        
        toast.success('Setting created successfully');
      }
      
      // Сбрасываем форму и обновляем список
      resetNewSetting();
      setShowNewSettingForm(false);
      setEditingSettingId(null);
      fetchSystemSettings(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error submitting setting:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to save setting';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingNewSetting(false);
    }
  };

  const onSubmitBackupSettings = async (data: BackupSettingsFormValues) => {
    setIsSubmittingBackup(true);
    try {
      const response = await graphqlClient.request(CONFIGURE_BACKUP_SETTINGS_MUTATION, {
        settings: data,
      });
      
      if (response.configureBackupSettings.success) {
        toast.success('Backup settings updated successfully');
        fetchBackupSettings(); // Обновляем данные
      } else {
        throw new Error(response.configureBackupSettings.message);
      }
    } catch (error: any) {
      console.error('Error updating backup settings:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to update backup settings';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingBackup(false);
    }
  };

  const handleDeleteSetting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this setting? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await graphqlClient.request(DELETE_SYSTEM_SETTING_MUTATION, { id });
      
      if (response.deleteSystemSetting) {
        toast.success('Setting deleted successfully');
        fetchSystemSettings(currentPage, searchTerm);
      }
    } catch (error: any) {
      console.error('Error deleting setting:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to delete setting';
      toast.error(errorMessage);
    }
  };

  const handleEditSetting = (setting: SystemSetting) => {
    // Заполняем форму данными выбранной настройки
    resetNewSetting({
      key: setting.key,
      value: setting.value,
      description: setting.description || '',
      dataType: setting.dataType as any,
      isPublic: setting.isPublic,
    });
    
    setEditingSettingId(setting.id);
    setShowNewSettingForm(true);
  };

  const handleSearch = () => {
    fetchSystemSettings(1, searchTerm);
  };

  const handleRefresh = () => {
    fetchSystemSettings(currentPage, searchTerm);
    fetchBackupSettings();
    fetchSystemStats();
    toast.success('Data refreshed');
  };

  const handlePageChange = (page: number) => {
    fetchSystemSettings(page, searchTerm);
  };

  // Колонки для таблицы системных настроек
  const systemSettingsColumns = [
    {
      header: 'Key',
      accessorKey: 'key',
    },
    {
      header: 'Value',
      accessorKey: 'value',
      cell: (setting: SystemSetting) => {
        // Для длинных значений показываем только часть
        const value = setting.value;
        if (value.length > 50) {
          return `${value.substring(0, 50)}...`;
        }
        return value;
      },
    },
    {
      header: 'Type',
      accessorKey: 'dataType',
      cell: (setting: SystemSetting) => (
        <span className="capitalize">{setting.dataType}</span>
      ),
    },
    {
      header: 'Public',
      accessorKey: 'isPublic',
      cell: (setting: SystemSetting) => (
        <span className={setting.isPublic ? 'text-green-600' : 'text-gray-500'}>
          {setting.isPublic ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (setting: SystemSetting) => setting.description || '-',
    },
    {
      header: 'Updated',
      accessorKey: 'updatedAt',
      cell: (setting: SystemSetting) => {
        const date = new Date(setting.updatedAt);
        return date.toLocaleDateString();
      },
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (setting: SystemSetting) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditSetting(setting)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDeleteSetting(setting.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-500">Manage application settings and configuration</p>
        </div>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-4">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="h-4 w-4 mr-2" />
            System Info
          </TabsTrigger>
        </TabsList>

        {/* Вкладка с основными настройками */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Manage global application settings and configuration parameters
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetNewSetting(); // Сброс формы при создании новой настройки
                    setEditingSettingId(null);
                    setShowNewSettingForm(!showNewSettingForm);
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {showNewSettingForm ? 'Cancel' : 'Add Setting'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewSettingForm && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle>{editingSettingId ? 'Edit Setting' : 'Add New Setting'}</CardTitle>
                    <CardDescription>
                      {editingSettingId
                        ? 'Modify an existing setting value, type, or description'
                        : 'Create a new system configuration parameter'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitNewSetting(onSubmitNewSetting)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="key">Key <span className="text-red-500">*</span></Label>
                          <Input
                            id="key"
                            {...registerNewSetting('key')}
                            placeholder="setting_name"
                            disabled={!!editingSettingId} // Ключ нельзя изменить при редактировании
                          />
                          {errorsNewSetting.key && (
                            <p className="text-sm text-red-500">{errorsNewSetting.key.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="value">Value <span className="text-red-500">*</span></Label>
                          <Input
                            id="value"
                            {...registerNewSetting('value')}
                            placeholder="Setting value"
                          />
                          {errorsNewSetting.value && (
                            <p className="text-sm text-red-500">{errorsNewSetting.value.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dataType">Data Type <span className="text-red-500">*</span></Label>
                          <Controller
                            control={controlNewSetting}
                            name="dataType"
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select data type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="json">JSON</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errorsNewSetting.dataType && (
                            <p className="text-sm text-red-500">{errorsNewSetting.dataType.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="isPublic" className="block mb-2">Public Setting</Label>
                          <div className="flex items-center gap-2">
                            <Controller
                              control={controlNewSetting}
                              name="isPublic"
                              render={({ field }) => (
                                <Switch
                                  id="isPublic"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              )}
                            />
                            <span className="text-sm text-gray-600">
                              Make this setting visible to all users
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          {...registerNewSetting('description')}
                          placeholder="Optional description of what this setting controls"
                          rows={3}
                        />
                        {errorsNewSetting.description && (
                          <p className="text-sm text-red-500">{errorsNewSetting.description.message}</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resetNewSetting();
                            setShowNewSettingForm(false);
                            setEditingSettingId(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmittingNewSetting}
                        >
                          {isSubmittingNewSetting ? (
                            <>
                              <Loader className="animate-spin h-4 w-4 mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {editingSettingId ? 'Update Setting' : 'Save Setting'}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search settings by key or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pr-10"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-0 top-0 h-full"
                      onClick={handleSearch}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <DataTable
                  columns={systemSettingsColumns}
                  data={systemSettings}
                  loading={loadingSettings}
                  pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: handlePageChange,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка с настройками резервного копирования */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>
                Configure automated backup schedule and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBackup ? (
                <div className="flex justify-center p-6">
                  <Loader className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <form onSubmit={handleSubmitBackup(onSubmitBackupSettings)} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={controlBackup}
                        name="backup_enabled"
                        render={({ field }) => (
                          <Switch
                            id="backup_enabled"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="backup_enabled" className="font-medium">
                        Enable Automated Backups
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 ml-11">
                      Automatically create database backups according to schedule
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 p-4 border rounded-md bg-gray-50">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="backup_frequency" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Backup Frequency
                        </Label>
                        <Controller
                          control={controlBackup}
                          name="backup_frequency"
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={!controlBackup._formValues.backup_enabled}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errorsBackup.backup_frequency && (
                          <p className="text-sm text-red-500">{errorsBackup.backup_frequency.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="backup_retention_days">Retention Period (days)</Label>
                        <Input
                          id="backup_retention_days"
                          type="number"
                          min="1"
                          max="365"
                          {...registerBackup('backup_retention_days')}
                          disabled={!controlBackup._formValues.backup_enabled}
                        />
                        {errorsBackup.backup_retention_days && (
                          <p className="text-sm text-red-500">{errorsBackup.backup_retention_days.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="backup_storage_location">Storage Location</Label>
                        <Input
                          id="backup_storage_location"
                          {...registerBackup('backup_storage_location')}
                          placeholder="/path/to/backup/directory"
                          disabled={!controlBackup._formValues.backup_enabled}
                        />
                        {errorsBackup.backup_storage_location && (
                          <p className="text-sm text-red-500">{errorsBackup.backup_storage_location.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Controller
                            control={controlBackup}
                            name="backup_email_notification"
                            render={({ field }) => (
                              <Switch
                                id="backup_email_notification"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!controlBackup._formValues.backup_enabled}
                              />
                            )}
                          />
                          <Label htmlFor="backup_email_notification" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Notifications
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600 ml-11">
                          Send email notifications about backup status
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="backup_notification_email">Notification Email</Label>
                        <Input
                          id="backup_notification_email"
                          type="email"
                          {...registerBackup('backup_notification_email')}
                          placeholder="admin@example.com"
                          disabled={!controlBackup._formValues.backup_enabled || !controlBackup._formValues.backup_email_notification}
                        />
                        {errorsBackup.backup_notification_email && (
                          <p className="text-sm text-red-500">{errorsBackup.backup_notification_email.message}</p>
                        )}
                      </div>

                      <div className="mt-7 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Backup Information</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Ensure the storage location has sufficient space and appropriate permissions.
                              Backups will include database and uploaded files.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmittingBackup}
                    >
                      {isSubmittingBackup ? (
                        <>
                          <Loader className="animate-spin h-4 w-4 mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Backup Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Manual Backup & Restore</CardTitle>
              <CardDescription>
                Manually create backups or restore the system from an existing backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Create Backup</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Manually create a full system backup with all data, settings and files
                    </p>
                    <Button variant="secondary" className="w-full">
                      <Database className="h-4 w-4 mr-2" />
                      Create Backup Now
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Restore System</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Restore the system from a previously created backup file
                    </p>
                    <Button variant="outline" className="w-full">
                      <Server className="h-4 w-4 mr-2" />
                      Restore from Backup
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Security Note</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Backup files contain sensitive information and should be stored securely.
                      Restoring from a backup will overwrite all current data and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка с системной информацией */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Key statistics and system usage information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex justify-center p-6">
                    <Loader className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : systemStats ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium mb-2 flex items-center">
                        <div className="h-5 w-5 mr-2 text-blue-600 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        User Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Total Users:</span>
                          <span className="font-medium">{systemStats.users.totalUsers}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Active Users:</span>
                          <span className="font-medium">{systemStats.users.activeUsers}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Administrators:</span>
                          <span className="font-medium">{systemStats.users.admins}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Managers:</span>
                          <span className="font-medium">{systemStats.users.managers}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Specialists:</span>
                          <span className="font-medium">{systemStats.users.specialists}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-md font-medium mb-2 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-purple-600" />
                        System Configuration
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Settings:</span>
                          <span className="font-medium">{systemStats.settings.totalSettings}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Public Settings:</span>
                          <span className="font-medium">{systemStats.settings.publicSettings}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Permissions:</span>
                          <span className="font-medium">{systemStats.permissions.totalPerms}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Granted:</span>
                          <span className="font-medium">{systemStats.permissions.granted}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-md font-medium mb-2 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                        Audit Logs
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Total Logs:</span>
                          <span className="font-medium">{systemStats.auditLogs.totalLogs}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Last 24 Hours:</span>
                          <span className="font-medium">{systemStats.auditLogs.lastDay}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Last Week:</span>
                          <span className="font-medium">{systemStats.auditLogs.lastWeek}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Last Month:</span>
                          <span className="font-medium">{systemStats.auditLogs.lastMonth}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t mt-4">
                      Last updated: {new Date(systemStats.timestamp).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No system statistics available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Database Statistics</CardTitle>
                <CardDescription>
                  Database table sizes and record counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex justify-center p-6">
                    <Loader className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : databaseStats.length > 0 ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-1 text-sm font-medium pb-2 border-b">
                      <div>Table</div>
                      <div>Rows</div>
                      <div>Size</div>
                    </div>
                    <div className="max-h-80 overflow-y-auto text-sm">
                      {databaseStats.map((table, index) => (
                        <div key={index} className="grid grid-cols-3 gap-1 py-2 border-b border-gray-100">
                          <div className="font-medium">{table.tableName}</div>
                          <div>{table.rowCount.toLocaleString()}</div>
                          <div>{table.totalSize}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No database statistics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>System Tools</CardTitle>
              <CardDescription>
                Advanced system maintenance and administration tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto py-6 flex flex-col">
                  <Database className="h-8 w-8 mb-2" />
                  <span className="text-lg">Clear Cache</span>
                  <span className="text-xs text-gray-500 mt-1">Reset system caches</span>
                </Button>
                
                <Button variant="outline" className="h-auto py-6 flex flex-col">
                  <Server className="h-8 w-8 mb-2" />
                  <span className="text-lg">System Check</span>
                  <span className="text-xs text-gray-500 mt-1">Verify system integrity</span>
                </Button>
                
                <Button variant="outline" className="h-auto py-6 flex flex-col">
                  <Settings className="h-8 w-8 mb-2" />
                  <span className="text-lg">Reset Defaults</span>
                  <span className="text-xs text-gray-500 mt-1">Restore default settings</span>
                </Button>
              </div>
              
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Warning</p>
                    <p className="text-xs text-red-700 mt-1">
                      These system tools can affect application functionality.
                      Use with caution and ensure you have a recent backup before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
