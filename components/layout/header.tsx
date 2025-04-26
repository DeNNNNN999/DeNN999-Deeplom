'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input' // Пример: если будет поиск
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCurrentUser, logout } from '@/lib/auth' 

// Определяем тип пользователя явно
type CurrentUser = {
  id: string
  email: string
  firstName?: string // Добавляем опциональные поля
  lastName?: string
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'
} | null

export function Header() {
  const { setTheme, theme } = useTheme()
  const [user, setUser] = useState<CurrentUser>(null)
  const [isMounted, setIsMounted] = useState(false) // Для избежания гидратации тем

  useEffect(() => {
    setUser(getCurrentUser() as CurrentUser)
    setIsMounted(true) // Компонент смонтирован
  }, [])

  const handleLogout = () => {
    logout() // Вызываем функцию выхода из lib/auth
  }

  // Генерация инициалов для AvatarFallback
  const getInitials = (firstName?: string, lastName?: string, email?: string): string => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U' // Пользователь по умолчанию
  }

  // Не рендерим UI переключателя темы, пока компонент не смонтирован
  const renderThemeToggle = () => {
    if (!isMounted) {
      return null // Или плейсхолдер
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/50"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
        <motion.div
          key={theme} // Анимация при смене темы
          initial={{ scale: 0.8, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}>
          <Icon icon={theme === 'light' ? 'mdi:weather-night' : 'mdi:weather-sunny'} width={22} height={22} />
        </motion.div>
      </Button>
    )
  }

  return (
    // Используем glass-effect и немного стилей
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
      className={cn(
        'sticky top-0 z-40 w-full border-b backdrop-blur-lg bg-background/70', // Эффект размытия фона
        'border-[hsl(var(--border)/0.5)]', // Полупрозрачная граница
        // "glass-effect" // Можно использовать ваш класс, если он включает backdrop-blur
      )}>
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 max-w-none px-4 md:px-6">
        {/* Левая часть (можно добавить лого или название) */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
          className="flex items-center gap-2">
          {/* <Icon icon="vaadin:factory" className="h-6 w-6 text-primary" /> */}
          {/* <span className="font-bold hidden md:inline-block">Supplier Hub</span> */}
        </motion.div>

        {/* Правая часть */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}
          className="flex flex-1 items-center justify-end space-x-3">
          {/* Поиск (пример) */}
          {/* <div className="w-full flex-1 md:w-auto md:flex-none">
             <Input
               type="search"
               placeholder="Search..."
               className="md:w-[200px] lg:w-[300px] h-9"
             />
           </div> */}

          {/* Переключатель темы */}
          {renderThemeToggle()}

          {/* Меню пользователя */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-border">
                    {/* Сюда можно добавить реальное изображение пользователя, если оно есть */}
                    {/* <AvatarImage src="/avatars/01.png" alt={user.email} /> */}
                    <AvatarFallback className="bg-primary/20 text-primary font-medium">
                      {getInitials(user.firstName, user.lastName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <Icon icon="mdi:logout" className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      </div>
    </motion.header>
  )
}
