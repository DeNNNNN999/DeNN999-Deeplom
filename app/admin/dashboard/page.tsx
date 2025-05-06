'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAnalyticsStore } from '@/lib/stores'
import { Icon } from '@iconify/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Users,
  Factory,
  File,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCcw,
  TrendingUp,
  PlusCircle,
} from 'lucide-react'

// Регистрируем GSAP плагины
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function AdminDashboard() {
  const router = useRouter()
  const cardsRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  const { summary, suppliersByCountry, contractsByStatus, loading, error, fetchAllAnalytics } = useAnalyticsStore()

  // Инициализируем данные при загрузке
  useEffect(() => {
    fetchAllAnalytics()
  }, [fetchAllAnalytics])

  // Анимации при загрузке страницы
  useEffect(() => {
    // Анимация заголовка
    gsap.fromTo(headingRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })

    // Анимация карточек
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.dashboard-card')

      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 30,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power2.out',
          delay: 0.3,
        },
      )
    }

    // Анимация блока быстрых действий
    if (actionsRef.current) {
      gsap.fromTo(
        actionsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power2.out' },
      )
    }

    // Создаем анимацию счетчика для чисел
    const animateNumbers = () => {
      if (!loading && summary) {
        const numberElements = document.querySelectorAll('.animate-number')

        numberElements.forEach(el => {
          const target = Number(el.getAttribute('data-target')) || 0
          const prefix = el.getAttribute('data-prefix') || ''

          gsap.from(el, {
            innerText: 0,
            duration: 2,
            ease: 'power2.out',
            snap: { innerText: 1 },
            onUpdate: function () {
              // @ts-ignore
              el.innerHTML = prefix + Math.floor(this.targets()[0].innerText).toLocaleString('ru-RU')
            },
          })
        })
      }
    }

    if (!loading) {
      animateNumbers()
    }
  }, [loading, summary])

  // Анимация обновления данных
  const handleRefresh = () => {
    // Анимация вращения иконки
    gsap.to('.refresh-icon', {
      rotation: 360,
      duration: 1,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set('.refresh-icon', { rotation: 0 })
      },
    })

    // Анимация карточек
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.dashboard-card')

      gsap.to(cards, {
        opacity: 0.5,
        scale: 0.98,
        stagger: 0.05,
        duration: 0.3,
        ease: 'power1.inOut',
        onComplete: () => {
          fetchAllAnalytics()

          // Возвращаем к нормальному состоянию
          gsap.to(cards, {
            opacity: 1,
            scale: 1,
            stagger: 0.05,
            duration: 0.5,
            delay: 0.3,
            ease: 'power2.out',
          })
        },
      })
    }
  }

  return (
    <DashboardLayout>
      {/* Заголовок страницы */}
      <div
        ref={headingRef}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold text-[#f8f8f2]
                         bg-gradient-to-r from-[#bd93f9] to-[#ff79c6] bg-clip-text text-transparent">
            Панель администратора
          </h1>
          <p className="text-[#6272a4] mt-1">Обзор системы управления поставщиками</p>
        </div>

        <Button
          onClick={handleRefresh}
          variant="outline"
          className="mt-3 md:mt-0 bg-[#44475a]/50 text-[#f8f8f2] border-[#bd93f9]/30
                     hover:bg-[#44475a] hover:border-[#bd93f9]/60 transition-all duration-300">
          <RefreshCcw className="mr-2 h-4 w-4 refresh-icon" />
          Обновить данные
        </Button>
      </div>

      {/* Блок с ошибкой */}
      {error && (
        <Card className="mb-6 border-[#ff5555]/50 bg-[#ff5555]/10 text-[#ff5555] animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>Ошибка загрузки данных: {error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Основные карточки */}
      <div ref={cardsRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Карточка с информацией о поставщиках */}
        <Card
          className="dashboard-card overflow-hidden relative group transition-all duration-300
                         hover:shadow-lg hover:shadow-[#bd93f9]/10 border-[#44475a]/70
                         bg-[#282a36]/80 backdrop-blur-sm hover:scale-[1.02]">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-[#8be9fd] to-[#bd93f9]" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#bd93f9]">Поставщики</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full bg-[#44475a]/50" />
            ) : (
              <>
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-[#bd93f9]/10 mr-3 group-hover:scale-110 transition-transform duration-300">
                    <Factory className="h-8 w-8 text-[#bd93f9]" />
                  </div>
                  <div
                    className="text-3xl font-bold text-[#f8f8f2] animate-number"
                    data-target={summary?.totalSuppliers || 0}>
                    0
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div
                    className="flex flex-col items-center p-2 rounded-md bg-[#50fa7b]/10
                                  hover:bg-[#50fa7b]/20 hover:scale-105 transition-all duration-300">
                    <span className="text-[#50fa7b] font-semibold">{summary?.approvedSuppliers || 0}</span>
                    <span className="text-[#6272a4]">Утверждено</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-2 rounded-md bg-[#f1fa8c]/10
                                  hover:bg-[#f1fa8c]/20 hover:scale-105 transition-all duration-300">
                    <span className="text-[#f1fa8c] font-semibold">{summary?.pendingSuppliers || 0}</span>
                    <span className="text-[#6272a4]">Ожидает</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-2 rounded-md bg-[#ff5555]/10
                                  hover:bg-[#ff5555]/20 hover:scale-105 transition-all duration-300">
                    <span className="text-[#ff5555] font-semibold">{summary?.rejectedSuppliers || 0}</span>
                    <span className="text-[#6272a4]">Отклонено</span>
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/suppliers">
                <Button
                  className="w-full justify-start bg-[#44475a]/60 hover:bg-[#44475a]
                                   border-none text-[#f8f8f2]">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Подробная статистика
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Карточка с информацией о контрактах */}
        <Card
          className="dashboard-card overflow-hidden relative group transition-all duration-300
                         hover:shadow-lg hover:shadow-[#ff79c6]/10 border-[#44475a]/70
                         bg-[#282a36]/80 backdrop-blur-sm hover:scale-[1.02]">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-[#ff79c6] to-[#bd93f9]" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#ff79c6]">Контракты</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full bg-[#44475a]/50" />
            ) : (
              <>
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-[#ff79c6]/10 mr-3 group-hover:scale-110 transition-transform duration-300">
                    <File className="h-8 w-8 text-[#ff79c6]" />
                  </div>
                  <div
                    className="text-3xl font-bold text-[#f8f8f2] animate-number"
                    data-target={summary?.totalContracts || 0}>
                    0
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div
                    className="flex flex-col items-center p-2 rounded-md bg-[#50fa7b]/10
                                  hover:bg-[#50fa7b]/20 hover:scale-105 transition-all duration-300">
                    <span className="text-[#50fa7b] font-semibold">{summary?.activeContracts || 0}</span>
                    <span className="text-[#6272a4]">Активных</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-2 rounded-md bg-[#f1fa8c]/10
                                  hover:bg-[#f1fa8c]/20 hover:scale-105 transition-all duration-300">
                    <span className="text-[#f1fa8c] font-semibold">{summary?.expiringContracts || 0}</span>
                    <span className="text-[#6272a4]">Истекает</span>
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/contracts">
                <Button
                  className="w-full justify-start bg-[#44475a]/60 hover:bg-[#44475a]
                                   border-none text-[#f8f8f2]">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Подробная статистика
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Карточка с информацией о платежах */}
        <Card
          className="dashboard-card overflow-hidden relative group transition-all duration-300
                         hover:shadow-lg hover:shadow-[#50fa7b]/10 border-[#44475a]/70
                         bg-[#282a36]/80 backdrop-blur-sm hover:scale-[1.02]">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-[#50fa7b] to-[#8be9fd]" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#50fa7b]">Платежи</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full bg-[#44475a]/50" />
            ) : (
              <>
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-[#50fa7b]/10 mr-3 group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="h-8 w-8 text-[#50fa7b]" />
                  </div>
                  <div
                    className="text-3xl font-bold text-[#f8f8f2] animate-number"
                    data-prefix="₽"
                    data-target={summary?.totalPaymentsAmount || 0}>
                    ₽0
                  </div>
                </div>
                <div
                  className="flex flex-col p-2 bg-[#f1fa8c]/10 rounded-md mt-4 text-xs
                                hover:bg-[#f1fa8c]/20 hover:scale-[1.01] transition-all duration-300">
                  <span className="text-[#f1fa8c] font-semibold">
                    ₽{summary?.pendingPaymentsAmount?.toLocaleString('ru-RU') || 0}
                  </span>
                  <span className="text-[#6272a4]">Ожидает утверждения</span>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/payments">
                <Button
                  className="w-full justify-start bg-[#44475a]/60 hover:bg-[#44475a]
                                   border-none text-[#f8f8f2]">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Подробная статистика
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Карточка с системной информацией */}
        <Card
          className="dashboard-card overflow-hidden relative group transition-all duration-300
                         hover:shadow-lg hover:shadow-[#8be9fd]/10 border-[#44475a]/70
                         bg-[#282a36]/80 backdrop-blur-sm hover:scale-[1.02]">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-[#8be9fd] to-[#f1fa8c]" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#8be9fd]">Системная информация</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full bg-[#44475a]/50" />
            ) : (
              <>
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-[#8be9fd]/10 mr-3 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-8 w-8 text-[#8be9fd]" />
                  </div>
                  <div className="text-xl font-medium text-[#f8f8f2]">Операционная</div>
                </div>
                <div
                  className="flex flex-col p-2 bg-[#bd93f9]/10 rounded-md mt-4 text-xs
                                hover:bg-[#bd93f9]/20 hover:scale-[1.01] transition-all duration-300">
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">Версия системы:</span>
                    <span className="text-[#bd93f9] font-semibold">2.0.0</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[#6272a4]">База данных:</span>
                    <Badge variant="outline" className="text-[#50fa7b] border-[#50fa7b]/30 bg-[#50fa7b]/5">
                      Онлайн
                    </Badge>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[#6272a4]">Кэш:</span>
                    <Badge variant="outline" className="text-[#50fa7b] border-[#50fa7b]/30 bg-[#50fa7b]/5">
                      Активен
                    </Badge>
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/system">
                <Button
                  className="w-full justify-start bg-[#44475a]/60 hover:bg-[#44475a]
                                   border-none text-[#f8f8f2]">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Системная информация
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Нижние блоки */}
      <div ref={actionsRef} className="grid gap-4 mt-6 md:grid-cols-2">
        {/* Блок "Быстрые действия" */}
        <Card
          className="border-[#44475a]/70 bg-[#282a36]/80 backdrop-blur-sm
                        hover:shadow-lg hover:shadow-[#bd93f9]/10 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#f8f8f2] text-xl">
              <span className="bg-gradient-to-r from-[#bd93f9] to-[#ff79c6] bg-clip-text text-transparent">
                Быстрые действия
              </span>
            </CardTitle>
            <CardDescription className="text-[#6272a4]">Основные операции в системе</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-12 justify-start bg-gradient-to-r from-[#8be9fd]/10 to-[#bd93f9]/10
                               hover:from-[#8be9fd]/20 hover:to-[#bd93f9]/20 hover:scale-[1.02]
                               border border-[#44475a]/50 backdrop-blur-sm text-[#f8f8f2]
                               transition-all duration-300"
                      onClick={() => {
                        // Анимация нажатия кнопки
                        gsap.to('.button-factory', {
                          scale: 0.95,
                          duration: 0.2,
                          onComplete: () => {
                            gsap.to('.button-factory', {
                              scale: 1,
                              duration: 0.2,
                              onComplete: () => {
                                router.push('/admin/suppliers/create')
                              },
                            })
                          },
                        })
                      }}>
                      <Factory className="mr-2 h-4 w-4 text-[#bd93f9] button-factory" />
                      <span>Добавить поставщика</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                    Создать новую запись поставщика
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-12 justify-start bg-gradient-to-r from-[#ff79c6]/10 to-[#bd93f9]/10
                               hover:from-[#ff79c6]/20 hover:to-[#bd93f9]/20 hover:scale-[1.02]
                               border border-[#44475a]/50 backdrop-blur-sm text-[#f8f8f2]
                               transition-all duration-300"
                      onClick={() => {
                        gsap.to('.button-file', {
                          scale: 0.95,
                          duration: 0.2,
                          onComplete: () => {
                            gsap.to('.button-file', {
                              scale: 1,
                              duration: 0.2,
                              onComplete: () => {
                                router.push('/admin/contracts/create')
                              },
                            })
                          },
                        })
                      }}>
                      <File className="mr-2 h-4 w-4 text-[#ff79c6] button-file" />
                      <span>Создать контракт</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                    Создать новый контракт с поставщиком
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-12 justify-start bg-gradient-to-r from-[#50fa7b]/10 to-[#8be9fd]/10
                               hover:from-[#50fa7b]/20 hover:to-[#8be9fd]/20 hover:scale-[1.02]
                               border border-[#44475a]/50 backdrop-blur-sm text-[#f8f8f2]
                               transition-all duration-300"
                      onClick={() => {
                        gsap.to('.button-payment', {
                          scale: 0.95,
                          duration: 0.2,
                          onComplete: () => {
                            gsap.to('.button-payment', {
                              scale: 1,
                              duration: 0.2,
                              onComplete: () => {
                                router.push('/admin/payments/create')
                              },
                            })
                          },
                        })
                      }}>
                      <CreditCard className="mr-2 h-4 w-4 text-[#50fa7b] button-payment" />
                      <span>Новый платеж</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                    Зарегистрировать новый платеж в системе
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-12 justify-start bg-gradient-to-r from-[#f1fa8c]/10 to-[#ffb86c]/10
                               hover:from-[#f1fa8c]/20 hover:to-[#ffb86c]/20 hover:scale-[1.02]
                               border border-[#44475a]/50 backdrop-blur-sm text-[#f8f8f2]
                               transition-all duration-300"
                      onClick={() => {
                        gsap.to('.button-users', {
                          scale: 0.95,
                          duration: 0.2,
                          onComplete: () => {
                            gsap.to('.button-users', {
                              scale: 1,
                              duration: 0.2,
                              onComplete: () => {
                                router.push('/admin/users/create')
                              },
                            })
                          },
                        })
                      }}>
                      <Users className="mr-2 h-4 w-4 text-[#f1fa8c] button-users" />
                      <span>Добавить пользователя</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]">
                    Создать нового пользователя системы
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Блок "Требует внимания" */}
        <Card
          className="border-[#44475a]/70 bg-[#282a36]/80 backdrop-blur-sm
                        hover:shadow-lg hover:shadow-[#ff79c6]/10 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#f8f8f2] text-xl">
              <span className="bg-gradient-to-r from-[#ff79c6] to-[#ff5555] bg-clip-text text-transparent">
                Требует внимания
              </span>
            </CardTitle>
            <CardDescription className="text-[#6272a4]">Элементы, требующие действий</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full bg-[#44475a]/50" />
                <Skeleton className="h-8 w-full bg-[#44475a]/50" />
                <Skeleton className="h-8 w-full bg-[#44475a]/50" />
              </div>
            ) : (
              <div className="space-y-4">
                {summary?.pendingSuppliers ? (
                  <div
                    className="flex items-start bg-[#f1fa8c]/5 hover:bg-[#f1fa8c]/10 p-3 rounded-lg
                              transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                    onClick={() => router.push('/admin/suppliers?status=PENDING')}>
                    <div className="mr-3 p-1.5 bg-[#f1fa8c]/10 rounded-full">
                      <Clock className="h-4 w-4 text-[#f1fa8c]" />
                    </div>
                    <div>
                      <Link href="/admin/suppliers?status=PENDING">
                        <p className="text-sm font-medium text-[#f8f8f2] hover:text-[#f1fa8c] transition-colors duration-300">
                          {summary.pendingSuppliers} поставщиков требуют утверждения
                        </p>
                      </Link>
                      <p className="text-xs text-[#6272a4]">Проверьте и утвердите ожидающих поставщиков</p>
                    </div>
                  </div>
                ) : null}

                {summary?.expiringContracts ? (
                  <div
                    className="flex items-start bg-[#ff5555]/5 hover:bg-[#ff5555]/10 p-3 rounded-lg
                              transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                    onClick={() => router.push('/admin/contracts?expiring=true')}>
                    <div className="mr-3 p-1.5 bg-[#ff5555]/10 rounded-full">
                      <AlertCircle className="h-4 w-4 text-[#ff5555]" />
                    </div>
                    <div>
                      <Link href="/admin/contracts?expiring=true">
                        <p className="text-sm font-medium text-[#f8f8f2] hover:text-[#ff5555] transition-colors duration-300">
                          {summary.expiringContracts} контрактов скоро истекают
                        </p>
                      </Link>
                      <p className="text-xs text-[#6272a4]">Контракты с истекающим сроком действия</p>
                    </div>
                  </div>
                ) : null}

                {summary?.pendingPaymentsAmount ? (
                  <div
                    className="flex items-start bg-[#8be9fd]/5 hover:bg-[#8be9fd]/10 p-3 rounded-lg
                              transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                    onClick={() => router.push('/admin/payments?status=PENDING')}>
                    <div className="mr-3 p-1.5 bg-[#8be9fd]/10 rounded-full">
                      <CreditCard className="h-4 w-4 text-[#8be9fd]" />
                    </div>
                    <div>
                      <Link href="/admin/payments?status=PENDING">
                        <p className="text-sm font-medium text-[#f8f8f2] hover:text-[#8be9fd] transition-colors duration-300">
                          Платежи на сумму ₽{summary.pendingPaymentsAmount.toLocaleString('ru-RU')} ожидают утверждения
                        </p>
                      </Link>
                      <p className="text-xs text-[#6272a4]">Проверьте и утвердите платежи</p>
                    </div>
                  </div>
                ) : null}

                {!summary?.pendingSuppliers && !summary?.expiringContracts && !summary?.pendingPaymentsAmount && (
                  <div className="flex items-center justify-center py-6 bg-[#50fa7b]/5 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[#50fa7b] mr-2" />
                    <p className="text-[#50fa7b]">Все элементы обработаны, действий не требуется</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Дополнительные стили для анимаций */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 15px rgba(189, 147, 249, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(189, 147, 249, 0.5);
          }
        }

        .dashboard-card:hover {
          animation: pulse-glow 2s infinite;
        }
      `}</style>
    </DashboardLayout>
  )
}
