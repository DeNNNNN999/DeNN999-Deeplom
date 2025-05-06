import { GraphQLClient } from 'graphql-request'
// We can't import toast directly here as it would cause circular dependencies
// Instead, we'll handle errors in the component level

// Получаем URL API из переменных окружения или используем дефолтное значение
// Правильный URL для GraphQL API
const API_URL = typeof window !== 'undefined'
  ? window.location.origin + '/api/graphql'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/graphql'

// Создаем клиент GraphQL с дополнительными настройками
export const graphqlClient = new GraphQLClient(API_URL, {
credentials: 'include',
headers: () => {
try {
  // Получаем токен из localStorage или cookies
  let token = ''
  
if (typeof window !== 'undefined') {
  // В браузере
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    token = localStorage.getItem('auth_token') || ''
    
  // Проверяем куки, если в localStorage нет токена
  if (!token) {
    const cookies = document.cookie.split(';')
  const authCookie = cookies.find(c => c.trim().startsWith('auth_token='))
    if (authCookie) {
        token = authCookie.split('=')[1]
        }
      }
    } catch (e) {
    console.error('Error accessing localStorage:', e)
  }
  }
    
      // Всегда возвращаем заголовки, даже если произошла ошибка
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      }
    } catch (error) {
      console.error('GraphQL client headers error:', error)
      // Возвращаем минимальные заголовки
      return {
        'Content-Type': 'application/json',
      }
    }
  },
  errorPolicy: 'all', // Обрабатываем ошибки, но не блокируем запрос
  timeout: 30000,     // Увеличиваем таймаут до 30 секунд
})

/**
 * Хук для отправки GraphQL-запросов с обработкой ошибок и авторизацией
 */
export async function fetchGraphQL<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  try {
    // Добавляем таймаут для длительных запросов
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут
    
    // Выполняем запрос с таймаутом
    try {
      const response = await graphqlClient.request<T>(query, variables, {
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (fetchError: any) {
      clearTimeout(id);
      throw fetchError;
    }
  } catch (error: any) {
    // Детальная обработка ошибок GraphQL для лучшей диагностики
    console.error('GraphQL Error Details:', {
      message: error.message,
      response: error.response,
      request: {
        query: query.slice(0, 200) + '...', // Логируем только начало запроса
        variables
      },
      stack: error.stack?.slice(0, 500) // Ограничиваем размер стека
    })
    
    // Обработка ошибок авторизации
    if (error.response?.status === 401 || 
        error.response?.errors?.some((e: any) => e.message?.includes('unauthorized') || e.message?.includes('не авторизован'))) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        // Перенаправляем на страницу входа только если не находимся на ней
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login'
        }
      }
    }
    
    // Проверка на ошибку "schemaDef is not a function"
    if (error.message?.includes('schemaDef is not a function')) {
      const customError = new Error('Ошибка схемы GraphQL. Пожалуйста, обновите страницу.');
      customError.name = 'SchemaError';
      throw customError;
    }
    
    // Преобразуем ошибку, чтобы она была более понятной для пользователя
    if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch failed') || error instanceof TypeError) {
      const customError = new Error('Нет связи с сервером. Проверьте подключение к интернету.');
      customError.name = 'NetworkError';
      throw customError;
    }
    
    // Для ошибок Context creation failed
    if (error.message?.includes('Context creation failed')) {
      const customError = new Error('Ошибка инициализации сервера. Пожалуйста, попробуйте перезагрузить страницу.');
      customError.name = 'ContextError';
      throw customError;
    }
    
    // Если ошибка связана с таймаутом
    if (error.name === 'AbortError') {
      const customError = new Error('Запрос выполнялся слишком долго. Пожалуйста, попробуйте еще раз.');
      customError.name = 'TimeoutError';
      throw customError;
    }
    
    // Графовые ошибки обрабатываем отдельно
    if (error.response?.errors?.length > 0) {
      const graphqlError = error.response.errors[0];
      const customError = new Error(graphqlError.message || 'Ошибка запроса к API');
      customError.name = 'GraphQLError';
      throw customError;
    }
    
    // Прочие ошибки
    throw error;
  }
}
