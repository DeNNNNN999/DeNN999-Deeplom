'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@iconify/react' 
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

type NavItem = {
  title: string
  href: string
  icon: string
}

type SidebarProps = {
  items: NavItem[]
  role: string
}

export function SidebarNav({ items, role }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn('flex flex-col border-r bg-card h-full overflow-hidden', 'border-[hsl(var(--border)/0.5)]')}
    >
      {/* Шапка сайдбара */}
      <div
        className={cn(
          'flex items-center h-16 border-b px-4 shrink-0',
          'border-[hsl(var(--border)/0.5)]',
          collapsed ? 'justify-center' : 'justify-between',
        )}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <Icon icon="mdi:package-variant" className="text-primary shrink-0" width={24} height={24} />
              <span className="font-bold whitespace-nowrap text-lg">
                {role === 'ADMIN' ? 'Admin Panel' : role === 'PROCUREMENT_MANAGER' ? 'Manager Panel' : 'Specialist Panel'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
            <Icon
              icon={collapsed ? 'mdi:menu-open' : 'mdi:menu-close'}
              width={22}
              height={22}
            />
          </motion.div>
        </Button>
      </div>

      {/* Список ссылок */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <nav className="grid gap-1.5 px-2">
          {items.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  pathname === item.href && 'bg-primary/10 text-primary font-semibold',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon icon={item.icon} width={20} height={20} className="shrink-0" />
                
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>

      {/* Футер сайдбара */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-auto p-4 border-t border-[hsl(var(--border)/0.5)] shrink-0"
          >
            <p className="text-xs text-muted-foreground whitespace-nowrap">Version 0.1.0</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
