'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { gsap } from 'gsap'

type NavItem = {
  title: string
  href: string
  icon: string
}

type SidebarProps = {
  items: NavItem[]
  role: string
}

// Упрощенные тематические иконки для ролей
const roleIcons = {
  ADMIN: 'game-icons:crown',
  PROCUREMENT_MANAGER: 'game-icons:treasure-map',
  PROCUREMENT_SPECIALIST: 'game-icons:gears',
}

// Заголовки для каждой роли
const roleTitles = {
  ADMIN: 'Admin Console',
  PROCUREMENT_MANAGER: 'Manager Portal',
  PROCUREMENT_SPECIALIST: 'Specialist Hub',
}

// Градиенты Dracula для элементов навигации
const navGradients = [
  'from-[#ff79c6] to-[#bd93f9]', // Розовый → Фиолетовый
  'from-[#8be9fd] to-[#50fa7b]', // Голубой → Зеленый
  'from-[#f1fa8c] to-[#ffb86c]', // Желтый → Оранжевый
  'from-[#ff5555] to-[#ff79c6]', // Красный → Розовый
  'from-[#50fa7b] to-[#8be9fd]', // Зеленый → Голубой
  'from-[#bd93f9] to-[#ff5555]', // Фиолетовый → Красный
]

export function SidebarNav({ items, role }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const navItemsRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const activeIndicatorRef = useRef<HTMLDivElement>(null)

  // Управление режимом раскрытия сайдбара
  const expandSidebar = () => {
    if (!isPinned && collapsed) {
      setCollapsed(false)
    }
  }

  const collapseSidebar = () => {
    if (!isPinned && !collapsed) {
      setCollapsed(true)
    }
  }

  // Анимация логотипа при загрузке компонента
  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { scale: 0.8, opacity: 0, rotation: -10 },
        {
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 0.8,
          ease: 'elastic.out(1, 0.5)',
        },
      )

      // Небольшая периодическая пульсация логотипа
      gsap.to(logoRef.current, {
        scale: 1.05,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
    }
  }, [])

  // Анимация элементов меню при первой загрузке
  useEffect(() => {
    if (navItemsRef.current) {
      const navItems = navItemsRef.current.querySelectorAll('.nav-item')

      gsap.fromTo(
        navItems,
        {
          x: -30,
          opacity: 0,
          filter: 'blur(10px)',
        },
        {
          x: 0,
          opacity: 1,
          filter: 'blur(0px)',
          stagger: 0.08,
          duration: 0.5,
          ease: 'power1.out',
          delay: 0.3,
        },
      )
    }
  }, [])

  // Анимация активного элемента меню
  useEffect(() => {
    const activeItem = navItemsRef.current?.querySelector('.nav-item.active')

    if (activeItem && activeIndicatorRef.current) {
      // Размещаем индикатор напротив активного элемента с анимацией
      const updateIndicator = () => {
        gsap.to(activeIndicatorRef.current, {
          top: (activeItem as HTMLElement).offsetTop + (activeItem as HTMLElement).offsetHeight / 2 - 12,
          duration: 0.4,
          ease: 'power2.out',
        })
      }

      updateIndicator()

      // Анимируем свечение активного элемента
      gsap.fromTo(
        activeItem,
        { boxShadow: '0 0 0 rgba(189, 147, 249, 0)' },
        {
          boxShadow: '0 0 10px rgba(189, 147, 249, 0.15)',
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        },
      )
    }
  }, [pathname, collapsed])

  // Анимация раскрытия/сворачивания сайдбара
  useEffect(() => {
    if (sidebarRef.current) {
      gsap.to(sidebarRef.current, {
        width: collapsed ? 70 : 250,
        duration: 0.4,
        ease: 'power2.inOut',
      })
    }
  }, [collapsed])

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={sidebarRef}
        onMouseEnter={expandSidebar}
        onMouseLeave={collapseSidebar}
        className={cn(
          'flex flex-col h-full relative z-10',
          'bg-[#282a36] border-r border-[#44475a]/70',
          'transition-shadow duration-300 ease-in-out',
          'overflow-hidden',
          collapsed ? 'w-[70px]' : 'w-[250px]',
        )}>
        {/* Стильный фоновый градиент */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#282a36] via-[#343746] to-[#282a36] opacity-50"></div>
          <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#282a36] to-transparent"></div>
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#282a36] to-transparent"></div>
        </div>

        {/* Шапка сайдбара */}
        <div className="flex items-center h-14 px-4 shrink-0 relative z-10 border-b border-[#44475a]/50">
          <div ref={logoRef} className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-[#bd93f9] to-[#ff79c6] shadow-lg shadow-[#bd93f9]/20">
              <Icon icon={roleIcons[role] || 'mdi:cube-outline'} className="text-white" width={22} height={22} />
            </div>

            {!collapsed && (
              <div className="flex flex-col truncate">
                <div className="text-[#f8f8f2] font-bold tracking-tight text-base">
                  {roleTitles[role] || 'Dashboard'}
                </div>
                <div className="text-[#6272a4] text-xs -mt-0.5">Enterprise</div>
              </div>
            )}
          </div>

          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCollapsed(!collapsed)
                    // Анимируем иконку при переключении
                    gsap.to('.toggle-icon', {
                      rotation: collapsed ? 0 : 180,
                      duration: 0.4,
                      ease: 'back.out',
                    })
                  }}
                  className="h-8 w-8 rounded-full hover:bg-[#44475a]/30">
                  <Icon
                    icon={collapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'}
                    width={18}
                    height={18}
                    className="toggle-icon text-[#bd93f9]"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Сами навигационные элементы */}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-track-[#44475a]/20 scrollbar-thumb-[#bd93f9]/30 relative z-10">
          <div ref={navItemsRef} className="grid gap-1 px-2">
            {/* Стильный индикатор активного пункта */}
            <div
              ref={activeIndicatorRef}
              className="absolute left-1 w-1.5 h-6 rounded-full bg-gradient-to-b from-[#ff79c6] to-[#bd93f9] z-10 opacity-80 transition-all"></div>

            {items.map((item, index) => {
              const isActive = pathname === item.href
              const gradientClasses = navGradients[index % navGradients.length]

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        'transition-all duration-200 relative group',
                        'hover:bg-[#44475a]/30 text-[#f8f8f2]',
                        collapsed && 'justify-center px-2',
                        isActive && 'active bg-[#44475a]/40 font-semibold',
                      )}>
                      {/* Эффект свечения при наведении */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300',
                          'bg-gradient-to-r',
                          gradientClasses,
                          'group-hover:opacity-10',
                        )}
                      />

                      {/* Иконка */}
                      <div
                        className={cn(
                          'relative flex items-center justify-center',
                          isActive && `text-gradient bg-gradient-to-r ${gradientClasses}`,
                        )}>
                        <Icon
                          icon={item.icon}
                          width={collapsed ? 22 : 20}
                          height={collapsed ? 22 : 20}
                          className={cn(
                            'transition-all duration-300',
                            isActive ? 'text-transparent' : 'text-[#f8f8f2]',
                          )}
                        />
                      </div>

                      {/* Название пункта меню */}
                      {!collapsed && (
                        <span
                          className={cn(
                            'whitespace-nowrap transition-colors duration-300',
                            isActive && `text-gradient bg-gradient-to-r ${gradientClasses}`,
                          )}>
                          {item.title}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                      {item.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        </div>

        {/* Глобальные стили для градиентного текста */}
        <style jsx global>{`
          .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
          }

          /* Кастомный скроллбар */
          .scrollbar-thin {
            scrollbar-width: thin;
          }

          .scrollbar-thin::-webkit-scrollbar {
            width: 4px;
          }

          .scrollbar-thin::-webkit-scrollbar-track {
            background: rgba(68, 71, 90, 0.2);
            border-radius: 3px;
          }

          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: rgba(189, 147, 249, 0.3);
            border-radius: 3px;
          }

          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: rgba(189, 147, 249, 0.5);
          }
        `}</style>
      </div>
    </TooltipProvider>
  )
}
