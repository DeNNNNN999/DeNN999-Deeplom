'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyticsStore } from '@/lib/stores';
import {
  BarChart3,
  Users,
  Factory,
  // Заменяем FileContract на File - эта иконка есть в lucide-react
  File,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  PlusCircle,
  RefreshCcw,
  TrendingUp
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const {
    summary,
    suppliersByCountry,
    contractsByStatus,
    loading,
    error,
    fetchAnalyticsSummary,
    fetchSuppliersByCountry,
    fetchContractsByStatus,
    fetchAllAnalytics
  } = useAnalyticsStore();

  useEffect(() => {
    // Загружаем все необходимые данные для дашборда
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  // Обработчик обновления данных
  const handleRefresh = () => {
    fetchAllAnalytics();
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Панель администратора</h1>
          <p className="text-gray-500">Обзор системы управления поставщиками</p>
        </div>
        <Button onClick={handleRefresh}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Обновить данные
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-600">Ошибка загрузки данных: {error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Карточка с информацией о поставщиках */}
        <Card className="overflow-hidden">
          <div className="absolute top-0 right-0 h-2 w-full bg-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Поставщики
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center">
                  <Factory className="h-8 w-8 text-blue-600 mr-3" />
                  <div className="text-3xl font-bold">{summary?.totalSuppliers || 0}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div className="flex flex-col items-center p-2 bg-green-50 rounded-md">
                    <span className="text-green-600 font-semibold">{summary?.approvedSuppliers || 0}</span>
                    <span className="text-gray-500">Утверждено</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-md">
                    <span className="text-yellow-600 font-semibold">{summary?.pendingSuppliers || 0}</span>
                    <span className="text-gray-500">Ожидает</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-red-50 rounded-md">
                    <span className="text-red-600 font-semibold">{summary?.rejectedSuppliers || 0}</span>
                    <span className="text-gray-500">Отклонено</span>
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/suppliers">
                <Button className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Подробная статистика
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Карточка с информацией о контрактах */}
        <Card className="overflow-hidden">
          <div className="absolute top-0 right-0 h-2 w-full bg-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Контракты
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center">
                  <File className="h-8 w-8 text-indigo-600 mr-3" />
                  <div className="text-3xl font-bold">{summary?.totalContracts || 0}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="flex flex-col items-center p-2 bg-green-50 rounded-md">
                    <span className="text-green-600 font-semibold">{summary?.activeContracts || 0}</span>
                    <span className="text-gray-500">Активных</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-md">
                    <span className="text-yellow-600 font-semibold">{summary?.expiringContracts || 0}</span>
                    <span className="text-gray-500">Истекает</span>
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/contracts">
                <Button className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Подробная статистика
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Карточка с информацией о платежах */}
        <Card className="overflow-hidden">
          <div className="absolute top-0 right-0 h-2 w-full bg-green-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Платежи
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-green-600 mr-3" />
                  <div className="text-3xl font-bold">
                    ${summary?.totalPaymentsAmount?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="flex flex-col p-2 bg-yellow-50 rounded-md mt-4 text-xs">
                  <span className="text-yellow-600 font-semibold">
                    ${summary?.pendingPaymentsAmount?.toLocaleString() || 0}
                  </span>
                  <span className="text-gray-500">Ожидает утверждения</span>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/payments">
                <Button className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Подробная статистика
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Карточка с информацией о пользователях */}
        <Card className="overflow-hidden">
          <div className="absolute top-0 right-0 h-2 w-full bg-purple-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Системная информация
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div className="text-xl font-medium">Операционная</div>
                </div>
                <div className="flex flex-col p-2 bg-blue-50 rounded-md mt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Версия системы:</span>
                    <span className="text-blue-600 font-semibold">1.0.0</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">База данных:</span>
                    <span className="text-green-600 font-semibold">Онлайн</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Кэш:</span>
                    <span className="text-green-600 font-semibold">Активен</span>
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Link href="/admin/system">
                <Button className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Системная информация
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mt-6 md:grid-cols-2">
        {/* Блок "Быстрые действия" */}
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>Основные операции в системе</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="h-12 justify-start"
                onClick={() => router.push('/admin/suppliers/create')}
              >
                <Factory className="mr-2 h-4 w-4" />
                <span>Добавить поставщика</span>
              </Button>
              <Button
                className="h-12 justify-start"
                onClick={() => router.push('/admin/contracts/create')}
              >
                <File className="mr-2 h-4 w-4" />
                <span>Создать контракт</span>
              </Button>
              <Button
                className="h-12 justify-start"
                onClick={() => router.push('/admin/payments/create')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Новый платеж</span>
              </Button>
              <Button
                className="h-12 justify-start"
                onClick={() => router.push('/admin/users/create')}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Добавить пользователя</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Блок "Требует внимания" */}
        <Card>
          <CardHeader>
            <CardTitle>Требует внимания</CardTitle>
            <CardDescription>Элементы, требующие действий</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {summary?.pendingSuppliers ? (
                  <div className="flex items-start">
                    <div className="mr-3 p-1.5 bg-yellow-100 rounded-full">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <Link href="/admin/suppliers?status=PENDING">
                        <p className="text-sm font-medium hover:underline">
                          {summary.pendingSuppliers} поставщиков требуют утверждения
                        </p>
                      </Link>
                      <p className="text-xs text-gray-500">
                        Проверьте и утвердите ожидающих поставщиков
                      </p>
                    </div>
                  </div>
                ) : null}

                {summary?.expiringContracts ? (
                  <div className="flex items-start">
                    <div className="mr-3 p-1.5 bg-red-100 rounded-full">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <Link href="/admin/contracts?expiring=true">
                        <p className="text-sm font-medium hover:underline">
                          {summary.expiringContracts} контрактов скоро истекают
                        </p>
                      </Link>
                      <p className="text-xs text-gray-500">
                        Контракты с истекающим сроком действия
                      </p>
                    </div>
                  </div>
                ) : null}

                {summary?.pendingPaymentsAmount ? (
                  <div className="flex items-start">
                    <div className="mr-3 p-1.5 bg-blue-100 rounded-full">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Link href="/admin/payments?status=PENDING">
                        <p className="text-sm font-medium hover:underline">
                          Платежи на сумму ${summary.pendingPaymentsAmount.toLocaleString()} ожидают утверждения
                        </p>
                      </Link>
                      <p className="text-xs text-gray-500">
                        Проверьте и утвердите платежи
                      </p>
                    </div>
                  </div>
                ) : null}

                {!summary?.pendingSuppliers && !summary?.expiringContracts && !summary?.pendingPaymentsAmount && (
                  <div className="flex items-center justify-center py-4">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-green-600">Все элементы обработаны, действий не требуется</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
