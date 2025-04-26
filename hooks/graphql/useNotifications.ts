import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { graphqlClient } from '@/lib/auth';
import { 
  GET_NOTIFICATIONS_QUERY,
  MARK_NOTIFICATION_AS_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_AS_READ_MUTATION,
  GET_NOTIFICATION_SETTINGS_QUERY,
  UPDATE_NOTIFICATION_SETTINGS_MUTATION
} from '@/lib/graphql/queries';
import {
  Notification,
  NotificationSettings,
  NotificationSettingsInput,
  PaginationInput,
  PaginatedResponse
} from '@/lib/graphql/types';

interface UseNotificationsProps {
  pagination?: PaginationInput;
  unreadOnly?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[] | null;
  paginatedData: PaginatedResponse<Notification> | null;
  notificationSettings: NotificationSettings | null;
  loading: boolean;
  error: Error | null;
  fetchNotifications: (pagination?: PaginationInput, unreadOnly?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  fetchNotificationSettings: () => Promise<NotificationSettings | null>;
  updateNotificationSettings: (settings: NotificationSettingsInput) => Promise<NotificationSettings | null>;
}

export const useNotifications = ({
  pagination = { page: 1, limit: 10 },
  unreadOnly = false
}: UseNotificationsProps = {}): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<Notification> | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async (
    newPagination: PaginationInput = pagination,
    newUnreadOnly: boolean = unreadOnly
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const variables = {
        pagination: newPagination,
        isRead: newUnreadOnly ? false : undefined
      };
      
      const { notifications } = await graphqlClient.request<{ 
        notifications: PaginatedResponse<Notification> 
      }>(
        GET_NOTIFICATIONS_QUERY,
        variables
      );
      
      setNotifications(notifications.items);
      setPaginatedData(notifications);
      return notifications.items;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке уведомлений');
      setError(error);
      console.error('Error fetching notifications:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pagination, unreadOnly]);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { markNotificationAsRead } = await graphqlClient.request<{ 
        markNotificationAsRead: Notification 
      }>(
        MARK_NOTIFICATION_AS_READ_MUTATION,
        { id }
      );
      
      // Обновляем локальное состояние
      setNotifications(prev => 
        prev ? prev.map(notification => 
          notification.id === id ? { ...notification, isRead: true } : notification
        ) : null
      );
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при отметке уведомления как прочитанного');
      console.error('Error marking notification as read:', error);
      toast.error(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { markAllNotificationsAsRead } = await graphqlClient.request<{ 
        markAllNotificationsAsRead: boolean 
      }>(
        MARK_ALL_NOTIFICATIONS_AS_READ_MUTATION
      );
      
      // Обновляем локальное состояние
      if (markAllNotificationsAsRead) {
        setNotifications(prev => 
          prev ? prev.map(notification => ({ ...notification, isRead: true })) : null
        );
        
        toast.success('Все уведомления отмечены как прочитанные');
      }
      
      return markAllNotificationsAsRead;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при отметке всех уведомлений как прочитанных');
      console.error('Error marking all notifications as read:', error);
      toast.error(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotificationSettings = useCallback(async (): Promise<NotificationSettings | null> => {
    try {
      setLoading(true);
      
      const { notificationSettings } = await graphqlClient.request<{ 
        notificationSettings: NotificationSettings 
      }>(
        GET_NOTIFICATION_SETTINGS_QUERY
      );
      
      setNotificationSettings(notificationSettings);
      return notificationSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при загрузке настроек уведомлений');
      console.error('Error fetching notification settings:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNotificationSettings = useCallback(async (
    settings: NotificationSettingsInput
  ): Promise<NotificationSettings | null> => {
    try {
      setLoading(true);
      
      const { updateNotificationSettings } = await graphqlClient.request<{ 
        updateNotificationSettings: NotificationSettings 
      }>(
        UPDATE_NOTIFICATION_SETTINGS_MUTATION,
        { input: settings }
      );
      
      setNotificationSettings(updateNotificationSettings);
      toast.success('Настройки уведомлений обновлены');
      return updateNotificationSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка при обновлении настроек уведомлений');
      console.error('Error updating notification settings:', error);
      toast.error(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    paginatedData,
    notificationSettings,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchNotificationSettings,
    updateNotificationSettings
  };
};
