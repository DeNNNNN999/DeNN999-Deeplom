'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { gsap } from 'gsap'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { usePathname } from 'next/navigation'

// Простой SVG логотип
const SupplierHubLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
    <defs>
      <linearGradient id="supplierHubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bd93f9" />
        <stop offset="100%" stopColor="#ff79c6" />
      </linearGradient>
    </defs>
    <rect x="8" y="20" width="32" height="20" rx="2" fill="url(#supplierHubGradient)" />
    <path d="M6 20L24 8L42 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="20" y="28" width="8" height="12" rx="1" fill="#44475a" />
    <rect x="12" y="24" width="4" height="4" rx="1" fill="#f8f8f2" />
    <rect x="32" y="24" width="4" height="4" rx="1" fill="#f8f8f2" />
    <rect x="12" y="32" width="4" height="4" rx="1" fill="#f8f8f2" />
    <rect x="32" y="32" width="4" height="4" rx="1" fill="#f8f8f2" />
  </svg>
)

// Определяем тип пользователя
type CurrentUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'
} | null

// Роли для отображения
const roleNames = {
  ADMIN: 'Administrator',
  PROCUREMENT_MANAGER: 'Procurement Manager',
  PROCUREMENT_SPECIALIST: 'Procurement Specialist',
}

export function Header() {
  const { setTheme, theme } = useTheme()
  const [user, setUser] = useState<CurrentUser>(null)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

  // Инициализация компонента
  useEffect(() => {
    setUser(getCurrentUser() as CurrentUser)
    setIsMounted(true)
  }, [])

  // Простой выход из системы
  const handleLogout = () => {
    logout()
  }

  // Получение инициалов для аватара
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
    return 'U'
  }

  // Выбор градиента для аватара на основе ID
  const getAvatarGradient = (userId: string) => {
    const colors = [
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-fuchsia-500 to-blue-600',
      'from-pink-500 to-orange-500',
    ]

    const colorIndex = userId ? userId.charCodeAt(0) % colors.length : 0
    return colors[colorIndex]
  }

  // Переключатель темы
  const renderThemeToggle = () => {
    if (!isMounted) return null

    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full text-[#f8f8f2] hover:bg-[#44475a]/50"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
        <Icon icon={theme === 'light' ? 'mdi:weather-night' : 'mdi:weather-sunny'} className="w-5 h-5" />
      </Button>
    )
  }

  return (
    <header
      className={cn('sticky top-0 z-40 w-full backdrop-blur-md border-b', 'border-[#44475a]/30', 'bg-[#282a36]/90')}>
      <div className="container flex h-14 items-center gap-x-4 justify-between max-w-none px-4">
        {/* Логотип и название */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9">
            <SupplierHubLogo className="h-9 w-9" />
          </div>

          <div className="hidden md:block font-bold text-white text-base">
            Supplier<span className="text-[#bd93f9]">Hub</span>
          </div>
        </div>

        {/* Правая часть - тема, профиль */}
        <div className="flex items-center space-x-1">
          {/* Переключатель темы */}
          {renderThemeToggle()}

          {/* Меню пользователя */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 rounded-full pl-1 pr-2 ml-1 gap-x-2 hover:bg-[#44475a]/50">
                  <Avatar
                    className={cn(
                      'h-7 w-7 rounded-full bg-gradient-to-br',
                      getAvatarGradient(user.id),
                      'border border-[#44475a]',
                    )}>
                    <AvatarImage src="" alt={user.email} />
                    <AvatarFallback className="text-white font-medium text-xs">
                      {getInitials(user.firstName, user.lastName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block text-sm text-[#f8f8f2] font-medium max-w-28 truncate">
                    {user.firstName || user.email.split('@')[0]}
                  </span>
                  <Icon icon="mdi:chevron-down" className="h-4 w-4 text-[#bd93f9]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-52 bg-[#282a36] border border-[#44475a] text-[#f8f8f2] mr-1.5 mt-1"
                align="end">
                <DropdownMenuLabel className="font-normal py-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-[#f8f8f2]">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-[#6272a4]">{user.email}</p>
                    <p className="text-xs text-[#8be9fd] mt-1">{roleNames[user.role] || user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#44475a]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="focus:bg-[#ff5555] focus:text-white cursor-pointer text-sm py-2">
                  <Icon icon="mdi:logout" className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
