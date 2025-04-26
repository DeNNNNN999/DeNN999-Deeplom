import './globals.css' //
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers' // Компонент-обертка для провайдеров

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Supplier Management System',
  description: 'A comprehensive system for managing suppliers, contracts, and procurement',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ВАЖНО: Анимации и стили здесь повлияют на ВСЕ страницы, включая логин
    <html lang="en">
      <body className={inter.className}>
        {' '}
        {/* Сюда можно добавить глобальные стили фона */}
        <Providers>
          {' '}
          {/* Провайдеры контекста, темы и т.д. */}
          {/* Сюда можно обернуть children для анимации перехода страниц */}
          {children}
        </Providers>
      </body>
    </html>
  )
}
