'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Briefcase, 
  Clock, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  FileText
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Упрощенная версия страницы без зависимостей от проблемных хуков
export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Имитируем загрузку
  const loading = false;

  // Простой компонент для статистической карточки
  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    trendValue,
    linkHref
  }: { 
    title: string;
    value: string | number;
    description?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    linkHref?: string;
  }) => {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              ) : trend === 'down' ? (
                <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              ) : null}
              <span className={`text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}`}>
                {trendValue}
              </span>
            </div>
          )}
        </CardContent>
        {linkHref && (
          <CardFooter className="p-2">
            <Link 
              href={linkHref}
              className="w-full flex items-center justify-center text-xs text-muted-foreground hover:text-primary"
            >
              Подробнее
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Панель управления</h1>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <Button asChild>
            <Link href="/specialist/suppliers/create" className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Новый поставщик
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/specialist/contracts/create" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Новый контракт
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <StatCard 
          title="Всего поставщиков" 
          value="42" 
          icon={AlertTriangle}
          description="Все зарегистрированные поставщики"
          linkHref="/specialist/suppliers"
        />
        <StatCard 
          title="Активные контракты" 
          value="18" 
          icon={Briefcase}
          description="Действующие контракты на текущий момент"
          linkHref="/specialist/contracts"
        />
        <StatCard 
          title="Истекают контракты" 
          value="5" 
          icon={Clock}
          description="Контракты, истекающие в ближайшие 30 дней"
          linkHref="/specialist/contracts"
          trend="up"
          trendValue="+2 новых за месяц"
        />
        <StatCard 
          title="Ожидают действий" 
          value="3" 
          icon={AlertTriangle}
          description="Поставщики и контракты, ожидающие обработки"
          linkHref="/specialist/suppliers"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="contracts">Истекающие контракты</TabsTrigger>
          <TabsTrigger value="suppliers">Новые поставщики</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Последние уведомления</CardTitle>
              <CardDescription>Последние обновления в системе</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-start space-x-4 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Новый поставщик добавлен</p>
                      <p className="text-sm text-muted-foreground">ООО "Технопарк" ожидает проверки</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        2 часа назад
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Контракт скоро истекает</p>
                      <p className="text-sm text-muted-foreground">Контракт #СТ-2023-045 истекает через 7 дней</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        3 часа назад
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/notifications')}>
                Просмотреть все уведомления
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Истекающие контракты</CardTitle>
              <CardDescription>Контракты, срок действия которых скоро истекает</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Поставщик</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата окончания</TableHead>
                    <TableHead>Осталось дней</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push('/specialist/contracts/1')}
                  >
                    <TableCell className="font-medium">Поставка оборудования</TableCell>
                    <TableCell>ООО "ТехСнаб"</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">Активен</Badge>
                    </TableCell>
                    <TableCell>
                      30.05.2025
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        3 дня
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push('/specialist/contracts/2')}
                  >
                    <TableCell className="font-medium">Услуги консалтинга</TableCell>
                    <TableCell>ИП Петров</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">Активен</Badge>
                    </TableCell>
                    <TableCell>
                      15.06.2025
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        20 дней
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/specialist/contracts')}>
                Просмотреть все контракты
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Новые поставщики</CardTitle>
              <CardDescription>Поставщики, ожидающие проверки и утверждения</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Страна/Город</TableHead>
                    <TableHead>Контактное лицо</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push('/specialist/suppliers/1')}
                  >
                    <TableCell className="font-medium">ООО "Технопарк"</TableCell>
                    <TableCell>
                      Россия
                      <span className="block text-xs text-muted-foreground">Москва</span>
                    </TableCell>
                    <TableCell>
                      Иванов И.И.
                      <span className="block text-xs text-muted-foreground">ivanov@technopark.ru</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-500">На рассмотрении</Badge>
                    </TableCell>
                    <TableCell>
                      20.04.2025
                    </TableCell>
                  </TableRow>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push('/specialist/suppliers/2')}
                  >
                    <TableCell className="font-medium">ИП Петров</TableCell>
                    <TableCell>
                      Россия
                      <span className="block text-xs text-muted-foreground">Санкт-Петербург</span>
                    </TableCell>
                    <TableCell>
                      Петров П.П.
                      <span className="block text-xs text-muted-foreground">petrov@mail.ru</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-500">На рассмотрении</Badge>
                    </TableCell>
                    <TableCell>
                      22.04.2025
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/specialist/suppliers')}>
                Просмотреть всех поставщиков
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
