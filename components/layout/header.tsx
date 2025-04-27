'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
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
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser, logout } from '@/lib/auth'
import { usePathname } from 'next/navigation'

// Кастомный SVG компонент для логотипа Supplier Hub
const SupplierHubLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 48 48" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
  >
    {/* Фоновый круг с градиентом */}
    <defs>
      <linearGradient id="supplierHubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bd93f9" />
        <stop offset="100%" stopColor="#ff79c6" />
      </linearGradient>
    </defs>
    
    {/* Основной корпус здания/фабрики */}
    <rect x="8" y="20" width="32" height="20" rx="2" fill="url(#supplierHubGradient)" />
    
    {/* Крыша */}
    <path d="M6 20L24 8L42 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Двери */}
    <rect x="20" y="28" width="8" height="12" rx="1" fill="#44475a" />
    
    {/* Окна */}
    <rect x="12" y="24" width="4" height="4" rx="1" fill="#f8f8f2" />
    <rect x="32" y="24" width="4" height="4" rx="1" fill="#f8f8f2" />
    <rect x="12" y="32" width="4" height="4" rx="1" fill="#f8f8f2" />
    <rect x="32" y="32" width="4" height="4" rx="1" fill="#f8f8f2" />
    
    {/* Линии соединений (сеть) */}
    <circle cx="24" cy="16" r="3" fill="#50fa7b" />
    <line x1="24" y1="19" x2="24" y2="25" stroke="#50fa7b" strokeWidth="1.5" />
    <line x1="24" y1="16" x2="14" y2="10" stroke="#50fa7b" strokeWidth="1.5" />
    <line x1="24" y1="16" x2="34" y2="10" stroke="#50fa7b" strokeWidth="1.5" />
    <circle cx="14" cy="10" r="2" stroke="#50fa7b" strokeWidth="1.5" fill="transparent" />
    <circle cx="34" cy="10" r="2" stroke="#50fa7b" strokeWidth="1.5" fill="transparent" />
  </svg>
);

// Определяем тип пользователя явно
type CurrentUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'
} | null

// Мап для иконок ролей
const roleIcons = {
  ADMIN: 'mdi:shield-crown',
  PROCUREMENT_MANAGER: 'mdi:account-tie',
  PROCUREMENT_SPECIALIST: 'mdi:account-cog',
}

// Мап для названий ролей
const roleNames = {
  ADMIN: 'Administrator',
  PROCUREMENT_MANAGER: 'Procurement Manager',
  PROCUREMENT_SPECIALIST: 'Procurement Specialist',
}

export function Header() {
  const { setTheme, theme } = useTheme()
  const [user, setUser] = useState<CurrentUser>(null)
  const [isMounted, setIsMounted] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const logoTextControls = useAnimation()
  const pathname = usePathname()
  const logoRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setUser(getCurrentUser() as CurrentUser)
    setIsMounted(true)
  }, [])

  // Эффект для наведения на хедер - создаем свечение/градиент
  useEffect(() => {
    if (!headerRef.current) return

    const createGlowEffect = (e: MouseEvent) => {
      const header = headerRef.current
      if (!header) return

      const rect = header.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      gsap.to(header, {
        '--x': `${x}px`,
        '--y': `${y}px`,
        duration: 0.3,
        ease: 'sine.out',
      })
    }

    const header = headerRef.current
    header.addEventListener('mousemove', createGlowEffect)

    return () => {
      header.removeEventListener('mousemove', createGlowEffect)
    }
  }, [])

  // Анимация для логотипа
  useEffect(() => {
    if (!logoRef.current) return;
    
    // Анимация дверей и окон логотипа при наведении
    const logo = logoRef.current;
    
    const animateLogo = () => {
      // Анимируем двери
      gsap.to(logo.querySelector('rect[x="20"]'), {
        y: 30, 
        height: 10,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        repeatDelay: 0.5
      });
      
      // Анимируем окна
      const windows = logo.querySelectorAll('rect[width="4"]');
      windows.forEach((window, index) => {
        gsap.to(window, {
          fill: '#8be9fd',
          duration: 0.2,
          delay: index * 0.1,
          yoyo: true,
          repeat: 1,
          repeatDelay: 0.2
        });
      });
      
      // Анимируем сеть
      gsap.to(logo.querySelectorAll('circle, line'), {
        stroke: '#ff79c6',
        strokeWidth: 2,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        repeatDelay: 0.5
      });
    };
    
    // Запускаем анимацию при первой загрузке
    const initialTimer = setTimeout(animateLogo, 1000);
    
    // Запускаем анимацию периодически
    const intervalTimer = setInterval(animateLogo, 10000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  // Анимация для текста логотипа
  useEffect(() => {
    const letters = Array.from('SupplierHub')
    const sequence = letters.map((_, i) => i * 0.05)
    
    logoTextControls.start(i => ({
      opacity: 1,
      y: 0,
      transition: { delay: sequence[i], duration: 0.3 }
    }))
  }, [logoTextControls])

  const handleLogout = () => {
    // Анимация перед выходом
    const header = headerRef.current
    if (header) {
      gsap.to(header, {
        y: -100,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.inOut',
        onComplete: () => logout()
      })
    } else {
      logout()
    }
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
    return 'U'
  }

  // Рандомный градиент для аватара на основе ID пользователя
  const getAvatarGradient = (userId: string) => {
    const colors = [
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-fuchsia-500 to-blue-600',
      'from-pink-500 to-orange-500',
      'from-green-500 to-emerald-500',
      'from-amber-500 to-red-500',
    ]
    
    // Используем id как "соль" для выбора градиента
    const colorIndex = userId ? userId.charCodeAt(0) % colors.length : 0
    return colors[colorIndex]
  }

  // Не рендерим UI переключателя темы, пока компонент не смонтирован
  const renderThemeToggle = () => {
    if (!isMounted) return null
    
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 relative overflow-hidden group"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {/* Эффект свечения при наведении */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/0 via-indigo-500/0 to-fuchsia-500/0 opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></span>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ scale: 0.5, opacity: 0, rotate: theme === 'light' ? -30 : 30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: theme === 'light' ? 30 : -30 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative z-10"
          >
            <Icon 
              icon={theme === 'light' ? 'mdi:weather-night' : 'mdi:weather-sunny'} 
              className={cn(
                "w-5 h-5",
                theme === 'dark' ? 'text-amber-300' : 'text-indigo-600'
              )} 
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Остаточное свечение */}
        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100">
          <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/10 to-fuchsia-500/10 blur-md animate-pulse"></span>
        </span>
      </Button>
    )
  }

  return (
    <header
      ref={headerRef}
      style={{'--x': '50%', '--y': '50%'} as React.CSSProperties}
      className={cn(
        'sticky top-0 z-40 w-full backdrop-blur-md border-b transition-all duration-300',
        'border-[hsl(var(--border)/0.3)]',
        // Базовые цвета в стиле Dracula - работает в обеих темах
        'bg-[#282a36]/80 dark:bg-[#282a36]/90',
        // Эффект свечения при наведении
        'before:absolute before:inset-0 before:bg-gradient-radial before:from-indigo-500/5 before:to-transparent',
        'before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500',
        'before:rounded-b-md before:bg-[radial-gradient(circle_at_var(--x)_var(--y),_rgba(99,102,241,0.15),_transparent_40%)]'
      )}>
      <div className="container flex h-16 items-center gap-x-4 justify-between max-w-none px-4 md:px-6">
        {/* Левая часть - Кастомный логотип и название */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="relative h-10 w-10 overflow-hidden">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.4
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 animate-pulse opacity-30 blur-md"
            />
            <motion.div 
              initial={{ rotate: -30, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ 
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.4
              }}
              className="flex items-center justify-center h-full"
            >
              <SupplierHubLogo 
                className="h-10 w-10 drop-shadow-md" 
                ref={logoRef}
              />
            </motion.div>
          </div>
          
          <div className="hidden md:flex items-baseline gap-1.5">
            <div className="flex overflow-hidden">
              {Array.from('Supplier').map((letter, i) => (
                <motion.span
                  key={`logo-1-${i}`}
                  custom={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={logoTextControls}
                  className="font-bold text-white text-lg"
                >
                  {letter}
                </motion.span>
              ))}
            </div>
            <div className="flex overflow-hidden">
              {Array.from('Hub').map((letter, i) => (
                <motion.span
                  key={`logo-2-${i}`}
                  custom={i + 8}
                  initial={{ opacity: 0, y: 10 }}
                  animate={logoTextControls}
                  className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Центральная часть - текущий путь */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.5 }}
          className="hidden md:flex items-center space-x-1 text-sm text-muted-foreground/70"
        >
          <Icon icon="mdi:map-marker-path" className="h-4 w-4 text-indigo-400/80" />
          <span className="text-[#f8f8f2]">{pathname?.replace(/\//g, ' / ')}</span>
        </motion.div>

        {/* Правая часть - переключатель темы, профиль */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}
          className="flex items-center space-x-1 sm:space-x-2"
        >
          {/* Переключатель темы */}
          {renderThemeToggle()}

          {/* Разделитель */}
          <div className="h-6 w-px bg-[#44475a] mx-0.5 hidden sm:block" />

          {/* Меню пользователя */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 rounded-full pl-1 pr-2 gap-x-2 hover:bg-[#44475a]/50"
                >
                  <Avatar className={cn(
                    "h-7 w-7 rounded-full bg-gradient-to-br", 
                    getAvatarGradient(user.id),
                    "border border-[#44475a] hover:border-[#bd93f9]"
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
                className="w-56 bg-[#282a36] border border-[#44475a] text-[#f8f8f2] mr-1.5 mt-1" 
                align="end"
              >
                <DropdownMenuLabel className="font-normal pt-3 pb-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-x-2">
                      <Avatar className={cn(
                        "h-8 w-8 rounded-full bg-gradient-to-br",
                        getAvatarGradient(user.id),
                        "border border-[#44475a]"
                      )}>
                        <AvatarFallback className="text-white font-medium text-xs">
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none text-[#f8f8f2]">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : user.email.split('@')[0]}
                        </p>
                        <p className="text-xs leading-none text-[#6272a4] mt-1">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-x-1.5 mt-3 pl-1">
                      <Icon 
                        icon={roleIcons[user.role] || 'mdi:account'} 
                        className="h-4 w-4 text-[#8be9fd]" 
                      />
                      <span className="text-xs text-[#8be9fd]">
                        {roleNames[user.role] || user.role}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#44475a]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="focus:bg-[#44475a] cursor-pointer text-sm">
                    <Icon icon="mdi:account-cog" className="mr-2 h-4 w-4 text-[#ff79c6]" />
                    <span>Profile Settings</span>
                    <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-[#44475a] cursor-pointer text-sm">
                    <Icon icon="mdi:cog" className="mr-2 h-4 w-4 text-[#f1fa8c]" />
                    <span>Preferences</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-[#44475a]" />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="focus:bg-[#ff5555] focus:text-white cursor-pointer text-sm"
                >
                  <Icon icon="mdi:logout" className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      </div>
    </header>
  )
}
