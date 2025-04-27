'use client'

import { ReactNode, useEffect, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AnimatePresence, motion } from 'framer-motion'
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

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Предотвращаем гидрацию темы
  useEffect(() => {
    setMounted(true)
    
    // Имитируем первоначальную загрузку приложения
    const timer = setTimeout(() => {
      setLoading(false)
    }, 800)
    
    return () => clearTimeout(timer)
  }, [])

  // Начальная анимация загрузки
  if (!mounted || loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          {/* Большой пульсирующий фон */}
          <div className="absolute w-40 h-40 bg-indigo-600/20 rounded-full animate-pulse filter blur-xl"></div>
          
          {/* Логотип или иконка */}
          <div className="relative z-10 mb-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative"
            >
              <Icon 
                icon="mdi:cube-outline" 
                className="text-indigo-500 w-20 h-20" 
              />
              <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: [1.2, 1.5, 1.2], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl -z-10"
              />
            </motion.div>
          </div>
          
          {/* Текст загрузки */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-xl font-medium mb-2 text-white">Supplier Management</h1>
            <p className="text-indigo-200/80 text-sm">Initializing system...</p>
          </motion.div>
          
          {/* Индикатор загрузки */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <div className="flex space-x-2">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0 }}
                  animate={{ y: [-5, 5, -5] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-3 h-3 bg-indigo-500 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        
        {/* Системы уведомлений */}
        <Toaster />
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
        
        {/* Девтулз для React Query (только при разработке) */}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
