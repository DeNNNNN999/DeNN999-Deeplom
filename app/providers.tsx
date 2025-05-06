'use client'

import { ReactNode, useEffect, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Icon } from '@iconify/react'

// Создаем клиент React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 минут
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // Предотвращаем гидрацию темы
  useEffect(() => {
    setMounted(true)
  }, [])

  // Предотвращаем проблемы SSR с темой
  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="absolute w-40 h-40 bg-indigo-600/20 rounded-full animate-pulse filter blur-xl"></div>
          <Icon icon="mdi:cube-outline" className="text-indigo-500 w-20 h-20 relative z-10 mb-6" />
          <div className="text-center">
            <h1 className="text-xl font-medium mb-2 text-white">Supplier Management</h1>
            <p className="text-indigo-200/80 text-sm">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}

        {/* Система уведомлений */}
        <SonnerToaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '0.5rem',
              border: '1px solid rgba(107, 114, 128, 0.1)',
              backgroundColor: 'var(--toast-bg, rgba(15, 15, 15, 0.9))',
              backdropFilter: 'blur(10px)',
              color: 'var(--toast-color, white)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
            },
            className: 'border border-border',
          }}
        />

        {/* DevTools для React Query (только при разработке) */}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
