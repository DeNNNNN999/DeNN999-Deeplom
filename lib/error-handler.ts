// Utility functions for handling API and GraphQL errors

/**
 * Formats a GraphQL error message for user-friendly display
 */
export function formatGraphQLError(error: any): string {
  console.error('GraphQL Error:', error);
  
  if (error.response?.errors?.length > 0) {
    // Extract the first GraphQL error message if available
    const firstError = error.response.errors[0];
    
    // Check if we have an extension code that we want to handle specially
    if (firstError.extensions?.code) {
      switch (firstError.extensions.code) {
        case 'UNAUTHENTICATED':
          return 'Необходима авторизация для выполнения этого действия';
        case 'FORBIDDEN':
          return 'У вас нет прав для выполнения этого действия';
        case 'NOT_FOUND':
          return 'Запрашиваемый ресурс не найден';
        case 'BAD_USER_INPUT':
          return firstError.message || 'Некорректные данные запроса';
        default:
          return firstError.message || 'Произошла ошибка при выполнении запроса';
      }
    }
    
    return firstError.message || 'Произошла ошибка при выполнении запроса';
  }
  
  // Network or other errors
  if (error.message) {
    if (error.message.includes('Failed to fetch')) {
      return 'Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к интернету';
    }
    
    return error.message;
  }
  
  return 'Произошла неизвестная ошибка';
}

/**
 * Check if error is a network connection error
 */
export function isNetworkError(error: any): boolean {
  return (
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('Network Error') ||
    error.message?.includes('Network request failed')
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error.response?.errors?.some(
      (e: any) => e.extensions?.code === 'UNAUTHENTICATED'
    ) || 
    error.response?.status === 401
  );
}
