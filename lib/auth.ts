import { GraphQLClient } from 'graphql-request';
import Cookies from 'js-cookie';

// Create a GraphQL client
export const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_API_URL || '/graphql',
  {
    headers: () => {
      // Get token from cookies when in browser environment
      if (typeof window !== 'undefined') {
        const token = Cookies.get('auth_token');
        if (token) {
          return {
            Authorization: `Bearer ${token}`,
          };
        }
      }
      return {} as Record<string, string>;
    },
  }
);

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const token = Cookies.get('auth_token');
  return !!token;
}

// Get current user from cookies/localStorage
export function getCurrentUser() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    return null;
  }
}

// Logout user
export function logout() {
  if (typeof window === 'undefined') {
    return;
  }
  
  Cookies.remove('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login';
}