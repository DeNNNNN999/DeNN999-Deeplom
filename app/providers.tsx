'use client'

import { ThemeProvider } from 'next-themes' 
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Оборачивает приложение в провайдер темы
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      {/* Отображает компоненты уведомлений */}
      <Toaster />
      <SonnerToaster richColors position="top-right" />
    </ThemeProvider>
  )
}
