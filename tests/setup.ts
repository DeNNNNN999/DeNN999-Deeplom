import { vi, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Add the jest-dom matchers to Vitest
expect.extend(matchers);

// Mock IntersectionObserver
class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

window.IntersectionObserver = IntersectionObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ScrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch
global.fetch = vi.fn();