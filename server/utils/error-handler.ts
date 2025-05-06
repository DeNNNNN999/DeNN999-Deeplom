import { GraphQLError } from 'graphql';

/**
 * Функция для обработки ошибок исполнения GraphQL запросов
 * Позволяет создавать стандартизированные ошибки для отправки клиенту
 *
 * @param error Объект ошибки
 * @param code Код ошибки (по умолчанию INTERNAL_SERVER_ERROR)
 * @param defaultMessage Сообщение по умолчанию
 * @returns GraphQLError с соответствующими параметрами
 */
export function handleError(
  error: any,
  code = 'INTERNAL_SERVER_ERROR',
  defaultMessage = 'An unexpected error occurred'
): GraphQLError {
  console.error('GraphQL Error:', error);
  
  // Извлекаем сообщение об ошибке
  const message = error?.message || defaultMessage;
  
  // Извлекаем детали оригинальной ошибки для расширений
  const extensions: Record<string, any> = { code };
  
  // Добавляем stacktrace в разработке
  if (process.env.NODE_ENV !== 'production') {
    extensions.stacktrace = error?.stack?.split('\n') || [];
  }
  
  return new GraphQLError(message, {
    extensions,
  });
}

/**
 * Обертка для улучшенной обработки ошибок с датами
 * 
 * @param fn Функция для обёртки
 * @returns Функция с обработкой ошибок
 */
export function withDateErrorHandling<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      if (error instanceof Error && error.message.includes('toISOString')) {
        throw new GraphQLError('Invalid date format provided', {
          extensions: {
            code: 'BAD_USER_INPUT',
            originalError: error.message,
          }
        });
      }
      throw error;
    }
  }) as T;
}
