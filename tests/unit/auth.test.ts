import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cookies from 'js-cookie';
import { isAuthenticated, getCurrentUser, logout } from '../../lib/auth';

// Mock dependencies
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    remove: vi.fn()
  }
}));

// Mock window.localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
});

describe('Auth Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    window.location.href = '';
  });

  describe('isAuthenticated', () => {
    it('should return true when auth_token is present in cookies', () => {
      vi.mocked(Cookies.get).mockReturnValue('valid-token');
      expect(isAuthenticated()).toBe(true);
      expect(Cookies.get).toHaveBeenCalledWith('auth_token');
    });

    it('should return false when auth_token is not present in cookies', () => {
      vi.mocked(Cookies.get).mockReturnValue(undefined);
      expect(isAuthenticated()).toBe(false);
      expect(Cookies.get).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user object from localStorage when available', () => {
      const mockUser = { id: '123', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'ADMIN' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const user = getCurrentUser();
      expect(user).toEqual(mockUser);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    it('should return null when user is not in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const user = getCurrentUser();
      expect(user).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    it('should return null when user JSON is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const user = getCurrentUser();
      expect(user).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });
  });

  describe('logout', () => {
    it('should remove auth_token cookie and user from localStorage', () => {
      logout();
      
      expect(Cookies.remove).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.href).toBe('/auth/login');
    });
  });
});