'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation' // Добавили usePathname
import { SidebarNav } from './sidebar-nav' // Наш анимированный сайдбар
import { Header } from './header' // Наша шапка
import { getCurrentUser } from '@/lib/auth' // Функция получения юзера
import { motion, AnimatePresence } from 'framer-motion' // Для анимации

// Тип для пользователя (убедитесь, что он соответствует данным из getCurrentUser)
type CurrentUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'
} | null

// Тип для элементов навигации
type NavItem = {
  title: string
  href: string
  icon: string
}

// Навигационные элементы для каждой роли (ваши списки)
const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: 'mdi:view-dashboard-outline' },
  { title: 'Suppliers', href: '/admin/suppliers', icon: 'mdi:factory' },
  { title: 'Contracts', href: '/admin/contracts', icon: 'mdi:file-document-outline' },
  { title: 'Payments', href: '/admin/payments', icon: 'mdi:cash-multiple' },
  { title: 'Users', href: '/admin/users', icon: 'mdi:account-group' },
  { title: 'Settings', href: '/admin/settings', icon: 'mdi:cog-outline' },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: 'mdi:clipboard-list-outline' },
]

const managerNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/manager/dashboard', icon: 'mdi:view-dashboard-outline' },
  { title: 'Suppliers', href: '/manager/suppliers', icon: 'mdi:factory' },
  { title: 'Contracts', href: '/manager/contracts', icon: 'mdi:file-document-outline' },
  { title: 'Payments', href: '/manager/payments', icon: 'mdi:cash-multiple' },
  { title: 'Categories', href: '/manager/categories', icon: 'mdi:tag-multiple-outline' },
  { title: 'Team', href: '/manager/team', icon: 'mdi:account-group' },
]

const specialistNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/specialist/dashboard', icon: 'mdi:view-dashboard-outline' },
  { title: 'Suppliers', href: '/specialist/suppliers', icon: 'mdi:factory' },
  { title: 'Contracts', href: '/specialist/contracts', icon: 'mdi:file-document-outline' },
  { title: 'Payments', href: '/specialist/payments', icon: 'mdi:cash-multiple' },
  { title: 'Documents', href: '/specialist/documents', icon: 'mdi:file-outline' },
]

// Тип пропсов для компонента
type DashboardLayoutProps = {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname() // Получаем текущий путь для ключа анимации

  // Получаем пользователя при монтировании компонента
  useEffect(() => {
    const currentUserData = getCurrentUser()
    if (!currentUserData) {
      // Редирект на логин, если пользователь не найден
      router.replace('/auth/login')
    } else {
      setUser(currentUserData as CurrentUser) // Устанавливаем пользователя
      setLoading(false) // Завершаем загрузку
    }
  }, [router])

  // Отображаем лоадер, пока идет проверка/загрузка пользователя
  if (loading) {
    return (
      // Стильный лоадер на весь экран
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-700 text-white">
        <div className="flex flex-col items-center gap-4">
          {/* Анимированный спиннер */}
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="text-lg font-medium tracking-wider animate-pulse">Загрузка интерфейса...</p>
        </div>
      </div>
    )
  }

  // Если пользователь так и не загрузился (маловероятно после проверки выше, но для безопасности)
  if (!user) {
    return null // Или можно вернуть компонент ошибки/редирект
  }

  // Определяем навигационные элементы на основе роли
  const navItems =
    user.role === 'ADMIN' ? adminNavItems : user.role === 'PROCUREMENT_MANAGER' ? managerNavItems : specialistNavItems

  return (
    // Основной flex-контейнер на всю высоту экрана
    <div className="flex h-screen bg-muted/40 dark:bg-gradient-to-br dark:from-gray-950 dark:via-background dark:to-gray-950">
      {/* Сайдбар (уже анимированный) */}
      <SidebarNav items={navItems} role={user.role} />

      {/* Правая часть: Шапка + Контент */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Шапка (компонент, который мы сделали ранее) */}
        <Header />

        {/* Основной контент страницы с анимацией */}
        {/* AnimatePresence для плавной смены контента */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname} // Ключ важен для AnimatePresence, чтобы понимать, что контент сменился
            initial={{ opacity: 0, y: 15 }} // Начальное состояние (невидимо, чуть ниже)
            animate={{ opacity: 1, y: 0 }} // Конечное состояние (видимо, на месте)
            exit={{ opacity: 0, y: -15 }} // Состояние при уходе (невидимо, чуть выше)
            transition={{ duration: 0.35, ease: 'easeInOut' }} // Настройки анимации
            // Стили для скролла и отступов + кастомный скроллбар из globals.css
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 custom-scrollbar">
            {children} {/* Здесь рендерится контент текущей страницы */}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
