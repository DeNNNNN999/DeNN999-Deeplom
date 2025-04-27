'use client'

import { ReactNode, useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarNav } from './sidebar-nav'
import { Header } from './header'
import { getCurrentUser } from '@/lib/auth'
import { gsap } from 'gsap'
import { motion, AnimatePresence, useSpring } from 'framer-motion'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'

// Типы навигационных элементов и пользователя
type NavItem = {
  title: string
  href: string
  icon: string
}

type CurrentUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'
} | null

// Расширенные навигационные элементы для каждой роли с подкатегориями
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

// Компонент лоадера с анимацией в стиле Dracula
const DashboardLoader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-[#282a36]">
      <div className="relative flex flex-col items-center gap-6">
        {/* Пульсирующий фоновый круг */}
        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-[#bd93f9]/20 to-[#ff79c6]/20 blur-xl animate-pulse"></div>

        {/* Анимированный логотип */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.8, 1.2, 1],
            opacity: 1,
            rotateY: [0, 360],
            transition: {
              duration: 1.5,
              ease: 'easeOut',
              rotateY: { repeat: Infinity, duration: 3, ease: 'linear' },
            },
          }}
          className="relative z-10">
          <div className="h-16 w-16 flex items-center justify-center bg-gradient-to-br from-[#bd93f9] to-[#ff79c6] rounded-2xl shadow-xl shadow-[#bd93f9]/20">
            <Icon icon="simple-icons:drizzle" className="h-10 w-10 text-white" />
          </div>
        </motion.div>

        {/* Текст загрузки */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center z-10">
          <h3 className="text-xl font-semibold mb-1 text-gradient-loader">Supplier Management</h3>
          <p className="text-[#f8f8f2] text-sm opacity-80">Enterprise Dashboard Loading</p>
        </motion.div>

        {/* Индикатор загрузки */}
        <div className="w-48 h-1.5 bg-[#44475a]/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-[#8be9fd] via-[#bd93f9] to-[#ff79c6] rounded-full"
          />
        </div>
      </div>
    </div>
  )
}

type DashboardLayoutProps = {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const [animationComplete, setAnimationComplete] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const mainRef = useRef<HTMLDivElement>(null)
  const decorativeOrbsRef = useRef<HTMLDivElement>(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const springX = useSpring(0, { stiffness: 100, damping: 30 })
  const springY = useSpring(0, { stiffness: 100, damping: 30 })

  // Получаем пользователя и инициализируем приложение
  useEffect(() => {
    const initializeApp = async () => {
      const currentUserData = getCurrentUser()
      if (!currentUserData) {
        router.replace('/auth/login')
        return
      }

      // Настраиваем пользователя и завершаем загрузку
      setUser(currentUserData as CurrentUser)

      // Небольшая искусственная задержка для красивой анимации загрузки
      setTimeout(() => {
        setLoading(false)
      }, 1000) // Уменьшил время загрузки с 2000 до 1000 мс
    }

    initializeApp()
  }, [router])

  // Устанавливаем флаг завершения анимации после скрытия загрузчика
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setAnimationComplete(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Эффект для декоративных элементов
  useEffect(() => {
    if (!animationComplete || !decorativeOrbsRef.current) return

    // Создаем декоративные шары в случайных местах
    const createDecorativeOrbs = () => {
      const orbs = decorativeOrbsRef.current
      if (!orbs) return

      // Очищаем контейнер
      while (orbs.firstChild) {
        orbs.removeChild(orbs.firstChild)
      }

      // Создаем новые шары
      for (let i = 0; i < 12; i++) {
        const orb = document.createElement('div')
        const size = 60 + Math.random() * 200
        orb.classList.add('orb')
        orb.style.width = `${size}px`
        orb.style.height = `${size}px`
        orb.style.borderRadius = '50%'
        orb.style.position = 'absolute'
        orb.style.opacity = (0.03 + Math.random() * 0.05).toString()
        orb.style.background = `radial-gradient(circle, rgba(189,147,249,0.6) 0%, rgba(255,121,198,0.3) 100%)`
        orb.style.filter = `blur(${15 + Math.random() * 25}px)`
        orb.style.left = `${Math.random() * 100}%`
        orb.style.top = `${Math.random() * 100}%`
        orb.style.transform = 'translate(-50%, -50%)'
        orb.style.pointerEvents = 'none'

        orbs.appendChild(orb)
      }
    }

    createDecorativeOrbs()

    // Анимируем декоративные шары с GSAP
    const animateOrbs = () => {
      const orbs = document.querySelectorAll('.orb')

      orbs.forEach((orb, index) => {
        gsap.to(orb, {
          x: `random(-150, 150, 5)`,
          y: `random(-150, 150, 5)`,
          opacity: `random(0.01, 0.1, 0.01)`,
          duration: 15 + Math.random() * 30,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.2,
        })
      })
    }

    animateOrbs()

    // Эффект движения шаров в зависимости от позиции курсора
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }

      if (mainRef.current) {
        const rect = mainRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width - 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5

        springX.set(x * 40)
        springY.set(y * 40)

        const orbs = document.querySelectorAll('.orb')
        orbs.forEach((orb, i) => {
          const depth = 1 + (i % 3) * 0.5
          gsap.to(orb, {
            x: `+=${x * 30 * depth}`,
            y: `+=${y * 30 * depth}`,
            duration: 2,
            ease: 'power2.out',
          })
        })
      }
    }

    if (mainRef.current) {
      mainRef.current.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      if (mainRef.current) {
        mainRef.current.removeEventListener('mousemove', handleMouseMove)
      }
      gsap.killTweensOf('.orb')
    }
  }, [animationComplete, springX, springY])

  // Отображаем лоадер, пока идет проверка/загрузка пользователя
  if (loading) {
    return <DashboardLoader />
  }

  // Если пользователь так и не загрузился
  if (!user) {
    return null
  }

  // Определяем навигационные элементы на основе роли
  const navItems =
    user.role === 'ADMIN' ? adminNavItems : user.role === 'PROCUREMENT_MANAGER' ? managerNavItems : specialistNavItems

  return (
    <div
      ref={mainRef}
      className={cn(
        'flex h-screen overflow-hidden',
        'bg-[#282a36] bg-opacity-95', // Основной цвет в стиле Dracula
        'relative', // Для позиционирования декоративных элементов
      )}>
      {/* Декоративный фоновый слой */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Фиксированный градиентный фон */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(40,42,54,1)_0%,rgba(68,71,90,0.7)_100%)]"></div>

        {/* Верхний декоративный градиент */}
        <div
          className="absolute top-0 left-0 right-0 h-[20vh]
          bg-gradient-to-b from-[#6272a4]/10 to-transparent"></div>

        {/* Нижний декоративный градиент */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[20vh]
          bg-gradient-to-t from-[#44475a]/10 to-transparent"></div>

        {/* Анимированные декоративные шары */}
        <div ref={decorativeOrbsRef} className="absolute inset-0 overflow-hidden"></div>

        {/* Сетчатый фон / Оверлей */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDQ0NzVhIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMCAwIHYgNjAgaCAxMm0wIC02MCB2IDYwIG0xMiAtNjAgdiA2MCBtMTIgLTYwIHYgNjAgbTEyIC02MCB2IDYwIG0xMiAtNjAgdiA2MCIvPjxwYXRoIGQ9Ik0wIDAgaCA2MCB2IDEybS02MCAwIGggNjAgbTAgMTIgaC02MCBtNjAgMTIgaC02MCBtNjAgMTIgaC02MCBtNjAgMTIgaC02MCIvPjwvZz48L3N2Zz4=')] opacity-25"></div>
      </div>

      {/* Боковое навигационное меню */}
      <SidebarNav items={navItems} role={user.role} />

      {/* Правая часть: Шапка + Контент */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Шапка */}
        <Header />

        {/* Основной контент страницы с анимацией */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1], // Плавная кривая анимации
            }}
            className={cn(
              'flex-1 overflow-hidden relative',
              'p-3 md:p-5 lg:p-6', // Уменьшенные отступы для лучшего использования пространства
            )}>
            {/* Контейнер для скролла контента с кастомным скроллбаром */}
            <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar rounded-xl relative">
              {/* Полупрозрачный эффект стекла для фона контента */}
              <div className="absolute inset-0 backdrop-blur-[2px] bg-[#282a36]/30 rounded-xl z-0"></div>

              {/* Содержимое страницы */}
              <div className="relative z-10 h-full p-2 md:p-4">{children}</div>
            </div>
          </motion.main>
        </AnimatePresence>

        {/* Toaster для уведомлений */}
        <Toaster richColors />
      </div>

      {/* Стили для анимированного текста */}
      <style jsx global>{`
        .text-gradient-loader {
          background: linear-gradient(90deg, #ff79c6, #bd93f9, #8be9fd);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradient-shift 2s ease infinite;
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  )
}
