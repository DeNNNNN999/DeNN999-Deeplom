'use client'

import { ReactNode, useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarNav } from './sidebar-nav'
import { Header } from './header'
import { getCurrentUser } from '@/lib/auth'
import { gsap } from 'gsap'
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

// Навигационные элементы для каждой роли
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

// Улучшенный лоадер в стиле скриншота, но с лучшими анимациями
const EnhancedLoader = () => {
  const loaderRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Анимация прогресс-бара
    if (progressRef.current) {
      const bar = progressRef.current.querySelector('.progress-bar')
      if (bar) {
        gsap.fromTo(
          bar,
          { width: '5%' },
          {
            width: '100%',
            duration: 2,
            ease: 'power1.inOut',
          },
        )
      }
    }

    // Простые статичные декоративные элементы в фоне
    if (loaderRef.current) {
      const createDecorative = (count: number) => {
        for (let i = 0; i < count; i++) {
          const element = document.createElement('div')
          const size = 10 + Math.random() * 20
          const isRounded = Math.random() > 0.5

          element.style.position = 'absolute'
          element.style.width = `${size}px`
          element.style.height = `${size}px`
          element.style.borderRadius = isRounded ? '50%' : '20%'
          element.style.opacity = (0.1 + Math.random() * 0.3).toString()
          element.style.backgroundColor = ['#bd93f9', '#ff79c6', '#8be9fd'][Math.floor(Math.random() * 3)]
          element.style.left = `${Math.random() * 100}%`
          element.style.top = `${Math.random() * 100}%`
          element.style.filter = 'blur(2px)'

          loaderRef.current?.appendChild(element)

          // Очень легкое статичное движение для элементов фона
          gsap.to(element, {
            y: `${Math.random() * 30 - 15}`,
            duration: 10 + Math.random() * 10,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          })
        }
      }

      createDecorative(15)
    }
  }, [])

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-[#282a36] overflow-hidden">
      {/* Логотип с небольшой анимацией пульсации */}
      <div className="relative mb-6">
        <div className="h-16 w-16 flex items-center justify-center bg-[#bd93f9] rounded-xl shadow-[0_0_20px_rgba(189,147,249,0.5)]">
          <Icon icon="simple-icons:drizzle" className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Текст загрузки */}
      <h3 className="text-xl font-medium mb-8 text-white">Enterprise Dashboard Loading</h3>

      {/* Индикатор загрузки */}
      <div ref={progressRef} className="w-64 h-1.5 bg-[#44475a]/70 rounded-full overflow-hidden">
        <div className="progress-bar h-full bg-gradient-to-r from-[#8be9fd] via-[#bd93f9] to-[#ff79c6] rounded-full"></div>
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
  const decorRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Получаем пользователя и инициализируем приложение
  useEffect(() => {
    const initializeApp = async () => {
      const currentUserData = getCurrentUser()
      if (!currentUserData) {
        router.replace('/auth/login')
        return
      }

      setUser(currentUserData as CurrentUser)

      // Небольшая задержка для отображения загрузчика
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    }

    initializeApp()
  }, [router])

  // Переход от загрузки к интерфейсу
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setAnimationComplete(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Создание СТАТИЧНЫХ декоративных элементов (без следования за мышью)
  useEffect(() => {
    if (!animationComplete || !decorRef.current) return

    // Очищаем предыдущие элементы
    while (decorRef.current.firstChild) {
      decorRef.current.removeChild(decorRef.current.firstChild)
    }

    // Создаем фиксированные декоративные элементы
    const createFixedDecorations = () => {
      const numberOfElements = window.innerWidth < 768 ? 6 : 10

      for (let i = 0; i < numberOfElements; i++) {
        const orb = document.createElement('div')
        const size = 100 + Math.random() * 150

        orb.classList.add('decor-orb')
        orb.style.width = `${size}px`
        orb.style.height = `${size}px`
        orb.style.position = 'absolute'
        orb.style.borderRadius = '50%'
        orb.style.opacity = (0.02 + Math.random() * 0.06).toString()
        orb.style.background =
          'radial-gradient(circle, rgba(189,147,249,0.6) 0%, rgba(255,121,198,0.2) 70%, transparent 100%)'
        orb.style.filter = `blur(${20 + Math.random() * 30}px)`
        orb.style.left = `${Math.random() * 100}%`
        orb.style.top = `${Math.random() * 100}%`
        orb.style.pointerEvents = 'none'

        decorRef.current?.appendChild(orb)

        // Очень медленная и минимальная анимация, НЕ зависящая от мыши
        gsap.to(orb, {
          x: `${Math.random() * 40 - 20}`,
          y: `${Math.random() * 40 - 20}`,
          opacity: `+=${Math.random() * 0.03}`,
          duration: 15 + Math.random() * 20,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.5,
        })
      }
    }

    createFixedDecorations()

    return () => {
      gsap.killTweensOf('.decor-orb')
    }
  }, [animationComplete])

  // Анимация перехода между страницами
  useEffect(() => {
    if (!animationComplete || !contentRef.current) return

    gsap.fromTo(
      contentRef.current,
      {
        opacity: 0,
        y: 15,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      },
    )
  }, [pathname, animationComplete])

  // Отображаем лоадер, пока идет загрузка
  if (loading) {
    return <EnhancedLoader />
  }

  // Если пользователь не загрузился
  if (!user) {
    return null
  }

  // Определяем навигационные элементы на основе роли
  const navItems =
    user.role === 'ADMIN' ? adminNavItems : user.role === 'PROCUREMENT_MANAGER' ? managerNavItems : specialistNavItems

  return (
    <div className="flex h-screen overflow-hidden bg-[#282a36] relative">
      {/* Статичный декоративный фоновый слой */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Фиксированный градиентный фон */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(40,42,54,1)_0%,rgba(68,71,90,0.7)_100%)]"></div>

        {/* Статичные декоративные элементы */}
        <div ref={decorRef} className="absolute inset-0 overflow-hidden pointer-events-none"></div>

        {/* Сетчатый фон / Оверлей */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDQ0NzVhIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMCAwIHYgNjAgaCAxMm0wIC02MCB2IDYwIG0xMiAtNjAgdiA2MCBtMTIgLTYwIHYgNjAgbTEyIC02MCB2IDYwIG0xMiAtNjAgdiA2MCIvPjxwYXRoIGQ9Ik0wIDAgaCA2MCB2IDEybS02MCAwIGggNjAgbTAgMTIgaC02MCBtNjAgMTIgaC02MCBtNjAgMTIgaC02MCBtNjAgMTIgaC02MCIvPjwvZz48L3N2Zz4=')] opacity-25"></div>
      </div>

      {/* Боковое меню */}
      <SidebarNav items={navItems} role={user.role} />

      {/* Основной контент */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Шапка */}
        <Header />

        {/* Содержимое страницы */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative p-3 md:p-5 lg:p-6 custom-scrollbar">
          {/* Контейнер контента */}
          <div ref={contentRef} className="h-full w-full overflow-hidden rounded-xl relative">
            {/* Эффект стекла */}
            <div
              className="absolute inset-0 backdrop-blur-md bg-[#282a36]/30 rounded-xl z-0
                           shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                           border border-[#bd93f9]/10"></div>

            {/* Содержимое */}
            <div className="relative z-10 h-full px-3 py-4 md:p-5 overflow-auto custom-scrollbar">{children}</div>
          </div>
        </main>
      </div>

      {/* Toaster для уведомлений */}
      <Toaster richColors />

      {/* Глобальные стили */}
      <style jsx global>{`
        /* Кастомные стили скроллбара */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(68, 71, 90, 0.2);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(189, 147, 249, 0.4);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(189, 147, 249, 0.6);
        }

        /* Гладкий скролл */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  )
}
