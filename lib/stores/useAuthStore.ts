import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { graphqlClient } from '@/lib/auth';
import {
  User,
  UserRole,
  LoginInput,
  UserInput,
  UserUpdateInput,
  AuthPayload,
  Permission,
  PaginationInput,
  PaginatedResponse,
} from '@/lib/graphql/types';
import {
  CURRENT_USER_QUERY,
  GET_USER_QUERY,
  GET_USERS_QUERY,
  GET_ROLE_PERMISSIONS_MAP_QUERY,
} from '@/lib/graphql/queries';
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  CREATE_USER_MUTATION,
  UPDATE_USER_MUTATION,
  DELETE_USER_MUTATION,
  RESET_USER_PASSWORD_MUTATION,
  CHANGE_USER_ROLE_MUTATION,
  TOGGLE_USER_STATUS_MUTATION,
} from '@/lib/graphql/mutations';

interface AuthState {
  // Данные
  user: User | null;
  users: User[];
  paginatedUsers: PaginatedResponse<User> | null;
  token: string | null;
  permissions: Record<string, Record<string, boolean>>;
  
  // Состояние
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  // Действия - аутентификация
  login: (credentials: LoginInput) => Promise<boolean>;
  register: (userData: UserInput) => Promise<boolean>;
  logout: () => void;
  getCurrentUser: () => Promise<User | null>;
  
  // Действия - управление пользователями
  fetchUser: (id: string) => Promise<User | null>;
  fetchUsers: (pagination?: PaginationInput, search?: string) => Promise<void>;
  createUser: (userData: UserInput) => Promise<User | null>;
  updateUser: (id: string, userData: UserUpdateInput) => Promise<User | null>;
  deleteUser: (id: string) => Promise<boolean>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
  changeUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<boolean>;
  
  // Действия - разрешения
  fetchPermissions: (role: UserRole) => Promise<void>;
  
  // Вспомогательные функции
  hasPermission: (resource: string, action: string) => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      user: null,
      users: [],
      paginatedUsers: null,
      token: null,
      permissions: {},
      isAuthenticated: false,
      loading: false,
      error: null,
      
      // Действия - аутентификация
      
      // Вход в систему
      login: async (credentials: LoginInput) => {
        try {
          set({ loading: true, error: null });
          
          const { login } = await graphqlClient.request<{ login: AuthPayload }>(
            LOGIN_MUTATION,
            { input: credentials }
          );
          
          // Сохраняем токен в cookie
          Cookies.set('auth_token', login.token, { 
            expires: credentials.remember ? 30 : 1, 
            secure: process.env.NODE_ENV === 'production' 
          });
          
          // Обновляем состояние
          set({
            user: login.user,
            token: login.token,
            isAuthenticated: true,
          });
          
          // Загружаем разрешения для роли пользователя
          await get().fetchPermissions(login.user.role);
          
          toast.success(`Добро пожаловать, ${login.user.firstName}!`);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Неверный логин или пароль';
          set({ error: errorMessage, isAuthenticated: false });
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // Регистрация нового пользователя
      register: async (userData: UserInput) => {
        try {
          set({ loading: true, error: null });
          
          const { register } = await graphqlClient.request<{ register: AuthPayload }>(
            REGISTER_MUTATION,
            { input: userData }
          );
          
          // Сохраняем токен в cookie
          Cookies.set('auth_token', register.token, { 
            expires: 1, 
            secure: process.env.NODE_ENV === 'production' 
          });
          
          // Обновляем состояние
          set({
            user: register.user,
            token: register.token,
            isAuthenticated: true,
          });
          
          // Загружаем разрешения для роли пользователя
          await get().fetchPermissions(register.user.role);
          
          toast.success('Регистрация успешно завершена!');
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при регистрации';
          set({ error: errorMessage, isAuthenticated: false });
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // Выход из системы
      logout: () => {
        // Удаляем токен из cookie
        Cookies.remove('auth_token');
        
        // Сбрасываем состояние
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: {}
        });
        
        // Перенаправляем на страницу входа (должно происходить на уровне компонента)
      },
      
      // Получение текущего пользователя
      getCurrentUser: async () => {
        try {
          set({ loading: true, error: null });
          
          const { currentUser } = await graphqlClient.request<{ currentUser: User }>(
            CURRENT_USER_QUERY
          );
          
          set({
            user: currentUser,
            isAuthenticated: true,
          });
          
          // Загружаем разрешения для роли пользователя
          await get().fetchPermissions(currentUser.role);
          
          return currentUser;
        } catch (error) {
          // Если ошибка, значит токен недействителен
          const errorMessage = error instanceof Error ? error.message : 'Ошибка авторизации';
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false,
            error: errorMessage 
          });
          
          // Удаляем токен из cookie
          Cookies.remove('auth_token');
          
          return null;
        } finally {
          set({ loading: false });
        }
      },
      
      // Действия - управление пользователями
      
      // Получение пользователя по ID
      fetchUser: async (id: string) => {
        try {
          set({ loading: true, error: null });
          
          const { user } = await graphqlClient.request<{ user: User }>(
            GET_USER_QUERY,
            { id }
          );
          
          return user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке пользователя';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return null;
        } finally {
          set({ loading: false });
        }
      },
      
      // Получение списка пользователей
      fetchUsers: async (pagination = { page: 1, limit: 10 }, search) => {
        try {
          set({ loading: true, error: null });
          
          const { users } = await graphqlClient.request<{ 
            users: PaginatedResponse<User> 
          }>(
            GET_USERS_QUERY,
            { 
              pagination,
              search
            }
          );
          
          set({ 
            users: users.items,
            paginatedUsers: users
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке пользователей';
          set({ error: errorMessage });
          toast.error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },
      
      // Создание нового пользователя
      createUser: async (userData: UserInput) => {
        try {
          set({ loading: true, error: null });
          
          const { createUser } = await graphqlClient.request<{ createUser: User }>(
            CREATE_USER_MUTATION,
            { input: userData }
          );
          
          // Обновляем список пользователей
          set(state => ({
            users: [createUser, ...state.users]
          }));
          
          toast.success('Пользователь успешно создан');
          return createUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании пользователя';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return null;
        } finally {
          set({ loading: false });
        }
      },
      
      // Обновление пользователя
      updateUser: async (id: string, userData: UserUpdateInput) => {
        try {
          set({ loading: true, error: null });
          
          const { updateUser } = await graphqlClient.request<{ updateUser: User }>(
            UPDATE_USER_MUTATION,
            { id, input: userData }
          );
          
          // Обновляем список пользователей
          set(state => ({
            users: state.users.map(u => u.id === id ? { ...u, ...updateUser } : u),
            // Если это текущий пользователь, обновляем и его
            user: state.user?.id === id ? { ...state.user, ...updateUser } : state.user
          }));
          
          toast.success('Пользователь успешно обновлен');
          return updateUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении пользователя';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return null;
        } finally {
          set({ loading: false });
        }
      },
      
      // Удаление пользователя
      deleteUser: async (id: string) => {
        try {
          set({ loading: true, error: null });
          
          const { deleteUser } = await graphqlClient.request<{ deleteUser: boolean }>(
            DELETE_USER_MUTATION,
            { id }
          );
          
          if (deleteUser) {
            // Обновляем список пользователей
            set(state => ({
              users: state.users.filter(u => u.id !== id)
            }));
            
            toast.success('Пользователь успешно удален');
          }
          
          return deleteUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при удалении пользователя';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // Сброс пароля пользователя
      resetUserPassword: async (userId: string, newPassword: string) => {
        try {
          set({ loading: true, error: null });
          
          const { resetUserPassword } = await graphqlClient.request<{ 
            resetUserPassword: { success: boolean; message: string } 
          }>(
            RESET_USER_PASSWORD_MUTATION,
            { userId, newPassword }
          );
          
          if (resetUserPassword.success) {
            toast.success(resetUserPassword.message);
          } else {
            toast.error(resetUserPassword.message);
          }
          
          return resetUserPassword.success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при сбросе пароля';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // Изменение роли пользователя
      changeUserRole: async (userId: string, newRole: UserRole) => {
        try {
          set({ loading: true, error: null });
          
          const { changeUserRole } = await graphqlClient.request<{ 
            changeUserRole: { success: boolean; message: string } 
          }>(
            CHANGE_USER_ROLE_MUTATION,
            { userId, newRole }
          );
          
          if (changeUserRole.success) {
            // Обновляем список пользователей
            set(state => ({
              users: state.users.map(u => 
                u.id === userId ? { ...u, role: newRole } : u
              )
            }));
            
            toast.success(changeUserRole.message);
          } else {
            toast.error(changeUserRole.message);
          }
          
          return changeUserRole.success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при изменении роли';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // Изменение статуса пользователя (активен/неактивен)
      toggleUserStatus: async (userId: string, isActive: boolean) => {
        try {
          set({ loading: true, error: null });
          
          const { toggleUserStatus } = await graphqlClient.request<{ 
            toggleUserStatus: { success: boolean; message: string } 
          }>(
            TOGGLE_USER_STATUS_MUTATION,
            { userId, isActive }
          );
          
          if (toggleUserStatus.success) {
            // Обновляем список пользователей
            set(state => ({
              users: state.users.map(u => 
                u.id === userId ? { ...u, isActive } : u
              )
            }));
            
            toast.success(toggleUserStatus.message);
          } else {
            toast.error(toggleUserStatus.message);
          }
          
          return toggleUserStatus.success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при изменении статуса пользователя';
          set({ error: errorMessage });
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },
      
      // Получение разрешений для определенной роли
      fetchPermissions: async (role: UserRole) => {
        try {
          set({ loading: true, error: null });
          
          const { rolePermissionsMap } = await graphqlClient.request<{ 
            rolePermissionsMap: Record<string, Record<string, boolean>> 
          }>(
            GET_ROLE_PERMISSIONS_MAP_QUERY,
            { role }
          );
          
          set({ permissions: rolePermissionsMap });
          // Не возвращаем значение, чтобы соответствовать типу Promise<void>
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке разрешений';
          set({ error: errorMessage });
          console.error('Ошибка при загрузке разрешений:', errorMessage);
          // Не возвращаем значение
        } finally {
          set({ loading: false });
        }
      },
      
      // Проверка наличия разрешения
      hasPermission: (resource: string, action: string) => {
        const { permissions } = get();
        
        // Если нет разрешений, возвращаем false
        if (!permissions || Object.keys(permissions).length === 0) {
          return false;
        }
        
        // Проверяем наличие разрешения для ресурса и действия
        return permissions[resource]?.[action] === true;
      },
      
      // Очистка ошибки
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage', // имя для localStorage
      partialize: (state) => ({
        // Сохраняем только нужные данные в localStorage
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
