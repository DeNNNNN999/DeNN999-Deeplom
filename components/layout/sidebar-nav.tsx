'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { gsap } from 'gsap'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type NavItem = {
  title: string
  href: string
  icon: string
}

type SidebarProps = {
  items: NavItem[]
  role: string
}

// Драматичные мультяшные иконки для разных ролей
const roleIcons = {
  ADMIN: 'game-icons:crown',
  PROCUREMENT_MANAGER: 'game-icons:treasure-map',
  PROCUREMENT_SPECIALIST: 'game-icons:gears',
}

// Мап для заголовков панелей
const roleTitles = {
  ADMIN: 'Admin Console',
  PROCUREMENT_MANAGER: 'Manager Portal',
  PROCUREMENT_SPECIALIST: 'Specialist Hub',
}

// Функция для создания градиента для конкретной ссылки
const getLinkGradient = (index: number) => {
  const gradients = [
    'from-[#ff79c6] to-[#bd93f9]', // Розовый → Фиолетовый
    'from-[#8be9fd] to-[#50fa7b]', // Голубой → Зеленый
    'from-[#f1fa8c] to-[#ffb86c]', // Желтый → Оранжевый
    'from-[#ff5555] to-[#ff79c6]', // Красный → Розовый
    'from-[#50fa7b] to-[#8be9fd]', // Зеленый → Голубой
    'from-[#bd93f9] to-[#ff5555]', // Фиолетовый → Красный
  ]
  return gradients[index % gradients.length]
}

export function SidebarNav({ items, role }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const logoIconControls = useAnimation()
  const activeLinkRef = useRef<HTMLAnchorElement>(null)

  // Расширенная система раскрытия меню
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

  // Эффект для анимации иконки логотипа
  useEffect(() => {
    const animateLogo = async () => {
      await logoIconControls.start({
        scale: [1, 1.2, 1],
        rotate: [0, 5, -5, 0],
        transition: { duration: 2, repeat: Infinity, repeatDelay: 5 },
      })
    }
    animateLogo()
  }, [logoIconControls])

  // Эффект для прокрутки активного пункта в видимую область
  useEffect(() => {
    if (activeLinkRef.current) {
      setTimeout(() => {
        activeLinkRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 500)
    }
  }, [pathname])

  // Эффект для создания эффекта свечения на активном пункте меню
  useEffect(() => {
    const createActiveItemGlow = () => {
      if (!activeLinkRef.current) return

      gsap.to(activeLinkRef.current, {
        boxShadow: '0 0 15px rgba(189, 147, 249, 0.3)',
        duration: 2,
        repeat: -1,
        yoyo: true,
      })
    }

    createActiveItemGlow()
  }, [pathname])

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        ref={sidebarRef}
        animate={{
          width: collapsed ? 76 : 280,
          boxShadow: collapsed ? '0 0 20px rgba(0, 0, 0, 0.1)' : '5px 0 20px rgba(0, 0, 0, 0.15)',
        }}
        transition={{
          duration: 0.4,
          ease: [0.25, 1, 0.5, 1],
          boxShadow: { duration: 0.5 },
        }}
        onMouseEnter={expandSidebar}
        onMouseLeave={collapseSidebar}
        className={cn(
          'flex flex-col h-full relative z-10 overflow-hidden',
          'bg-[#282a36] border-r border-[#44475a]/50',
          'transition-all duration-300 ease-in-out',
        )}>
        {/* Декоративный фоновый слой */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Градиентный фон с движением */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#282a36] via-[#44475a]/10 to-[#282a36] animate-gradient-shift"></div>
        </div>

        {/* Шапка сайдбара */}
        <div
          className={cn(
            'flex items-center h-16 px-4 shrink-0 relative z-10',
            'border-b border-[#44475a]/70',
            collapsed ? 'justify-center' : 'justify-between',
          )}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-3 overflow-hidden">
                <motion.div
                  animate={logoIconControls}
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-[#bd93f9] to-[#ff79c6] shadow-lg shadow-[#bd93f9]/20">
                  <Icon icon={roleIcons[role] || 'mdi:cube-outline'} className="text-white" width={24} height={24} />
                </motion.div>

                <div className="flex flex-col">
                  <div className="text-[#f8f8f2] font-bold tracking-tight text-lg">
                    {roleTitles[role] || 'Dashboard'}
                  </div>
                  <div className="text-[#6272a4] text-xs -mt-0.5">v2.0.0 Enterprise</div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="icon-only"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center justify-center">
                <motion.div
                  animate={logoIconControls}
                  className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-[#bd93f9] to-[#ff79c6] shadow-lg shadow-[#bd93f9]/20">
                  <Icon icon={roleIcons[role] || 'mdi:cube-outline'} className="text-white" width={24} height={24} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center space-x-1">
            {!collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPinned(!isPinned)}
                    className="h-8 w-8 rounded-full text-[#6272a4] hover:text-[#bd93f9] hover:bg-[#44475a]/30">
                    <Icon
                      icon={isPinned ? 'mdi:pin' : 'mdi:pin-off'}
                      width={18}
                      height={18}
                      className={cn(isPinned && 'text-[#bd93f9]', 'transition-transform hover:scale-110')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                  {isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(!collapsed)}
                  className="h-8 w-8 rounded-full text-[#6272a4] hover:text-[#bd93f9] hover:bg-[#44475a]/30">
                  <motion.div
                    animate={{
                      rotate: collapsed ? 0 : 180,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 0.4,
                      scale: { duration: 0.2, delay: 0.1 },
                    }}>
                    <Icon
                      icon={collapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'}
                      width={22}
                      height={22}
                      className="transition-transform hover:scale-110"
                    />
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Список ссылок */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 custom-scrollbar relative z-10 scroll-smooth">
          <nav className="grid gap-1 px-2">
            {items.map((item, index) => {
              const isActive = pathname === item.href
              const itemGradient = getLinkGradient(index)

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.4,
                          delay: index * 0.06,
                          ease: 'easeOut',
                        },
                      }}
                      whileHover={{ x: collapsed ? 0 : 4 }}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}>
                      <Link
                        href={item.href}
                        ref={isActive ? activeLinkRef : null}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative group',
                          'text-[#f8f8f2] hover:bg-[#44475a]/50',
                          collapsed && 'justify-center px-0',
                          isActive && `bg-[#44475a]/40 font-semibold`,
                        )}>
                        {/* Индикатор активного пункта */}
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-indicator"
                            className={cn(
                              'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-gradient-to-b',
                              itemGradient,
                            )}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}

                        {/* Эффект свечения при наведении */}
                        <div
                          className={cn(
                            'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 z-0',
                            'bg-gradient-to-r',
                            itemGradient,
                            'group-hover:opacity-10',
                          )}
                        />

                        <div
                          className={cn(
                            'relative z-10 flex items-center justify-center',
                            isActive ? `text-gradient-${index + 1}` : 'text-[#f8f8f2]',
                            (hoveredItem === item.href || isActive) && 'scale-110',
                            'transition-all duration-300',
                          )}>
                          <motion.div
                            animate={
                              isActive
                                ? {
                                    scale: [1, 1.1, 1],
                                    transition: {
                                      duration: 3,
                                      repeat: Infinity,
                                      repeatType: 'reverse',
                                    },
                                  }
                                : {}
                            }
                            className={cn(
                              'flex items-center justify-center',
                              isActive && 'text-gradient bg-clip-text',
                              itemGradient,
                            )}
                            style={{
                              // Для активных элементов применяем градиентный текст
                              color: isActive ? 'transparent' : undefined,
                              backgroundClip: isActive ? 'text' : undefined,
                              WebkitBackgroundClip: isActive ? 'text' : undefined,
                              backgroundImage: isActive
                                ? `linear-gradient(to right, var(--tw-gradient-stops))`
                                : undefined,
                            }}>
                            <Icon
                              icon={item.icon}
                              width={collapsed ? 24 : 20}
                              height={collapsed ? 24 : 20}
                              className={cn(
                                'transition-all duration-300',
                                isActive && 'drop-shadow-[0_0_3px_rgba(189,147,249,0.5)]',
                              )}
                            />
                          </motion.div>
                        </div>

                        <AnimatePresence mode="wait">
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{
                                opacity: 1,
                                width: 'auto',
                                transition: { duration: 0.3, delay: 0.1 },
                              }}
                              exit={{
                                opacity: 0,
                                width: 0,
                                transition: { duration: 0.2 },
                              }}
                              className={cn(
                                'whitespace-nowrap relative z-10 transition-colors duration-300',
                                isActive ? `text-gradient-${index + 1}` : 'text-[#f8f8f2]',
                                isActive && 'text-gradient bg-clip-text',
                              )}
                              style={
                                isActive
                                  ? {
                                      color: 'transparent',
                                      backgroundClip: 'text',
                                      WebkitBackgroundClip: 'text',
                                      backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                                    }
                                  : {}
                              }>
                              {item.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </motion.div>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                      {item.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>
        </div>

        {/* Футер сайдбара */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="mt-auto p-4 border-t border-[#44475a]/70 shrink-0 relative z-10">
              <div className="flex justify-center">
                <div className="text-xs text-[#6272a4]">v2.0.0</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Стили для градиентного текста */}
        <style jsx global>{`
          .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
          }
          .text-gradient-1 {
            background-image: linear-gradient(to right, #ff79c6, #bd93f9);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .text-gradient-2 {
            background-image: linear-gradient(to right, #8be9fd, #50fa7b);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .text-gradient-3 {
            background-image: linear-gradient(to right, #f1fa8c, #ffb86c);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .text-gradient-4 {
            background-image: linear-gradient(to right, #ff5555, #ff79c6);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .text-gradient-5 {
            background-image: linear-gradient(to right, #50fa7b, #8be9fd);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .text-gradient-6 {
            background-image: linear-gradient(to right, #bd93f9, #ff5555);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .text-gradient-7 {
            background-image: linear-gradient(to right, #ffb86c, #f1fa8c);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
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

          .animate-gradient-shift {
            background-size: 200% 200%;
            animation: gradient-shift 15s ease infinite;
          }
        `}</style>
      </motion.div>
    </TooltipProvider>
  )
}
