'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { graphqlClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Users, 
  Mail, 
  Bell, 
  Search, 
  Save,
  Info,
  Check,
  AlertCircle,
  User
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Switch
} from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  GET_DEPARTMENT_SPECIALISTS_QUERY,
  CURRENT_USER_QUERY
} from '@/lib/graphql/queries';
import {
  SET_DEPARTMENT_NOTIFICATIONS_MUTATION
} from '@/lib/graphql/mutations';

// Типы данных
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  lastLogin?: string;
};

type CurrentUser = User & {
  role: string;
  department: string;
};

// Типы для GraphQL запросов
type DepartmentSpecialistsResponse = {
  departmentSpecialists: User[];
};

type CurrentUserResponse = {
  currentUser: CurrentUser;
};

// Схема валидации формы настроек уведомлений
const notificationSettingsSchema = z.object({
  supplierCreated: z.boolean().default(true),
  supplierApproved: z.boolean().default(true),
  supplierRejected: z.boolean().default(true),
  contractCreated: z.boolean().default(true),
  contractApproved: z.boolean().default(true),
  contractRejected: z.boolean().default(true),
  paymentRequested: z.boolean().default(true),
  paymentApproved: z.boolean().default(true),
  paymentRejected: z.boolean().default(true),
  documentUploaded: z.boolean().default(true),
  contractExpiring: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
});

type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

// Симуляционные данные для статистики (так как в API не предусмотрены эндпоинты для специфической статистики по сотрудникам)
// В реальном приложении эти данные должны приходить с сервера
const getSpecialistStats = (userId: string) => {
  const stats = {
    suppliers: Math.floor(Math.random() * 15) + 5, // 5-20 поставщиков
    contracts: Math.floor(Math.random() * 10) + 3, // 3-12 контрактов
    payments: Math.floor(Math.random() * 8) + 2, // 2-10 платежей
    documents: Math.floor(Math.random() * 20) + 10, // 10-30 документов
    activity: [
      { date: '20.10.2024', action: 'Создан поставщик', entity: 'ООО "ТехноСервис"' },
      { date: '19.10.2024', action: 'Загружен документ', entity: 'Спецификация оборудования.pdf' },
      { date: '18.10.2024', action: 'Создан контракт', entity: 'Контракт №A-123 на поставку оборудования' },
      { date: '15.10.2024', action: 'Запрошен платеж', entity: 'Счет №INV-456' },
    ]
  };
  return stats;
};

export default function ManagerTeamPage() {
  const router = useRouter();
  const [specialists, setSpecialists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSpecialists, setFilteredSpecialists] = useState<User[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Установка формы управления уведомлениями
  const { register, handleSubmit, formState: { errors }, reset } = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      supplierCreated: true,
      supplierApproved: true,
      supplierRejected: true,
      contractCreated: true,
      contractApproved: true,
      contractRejected: true,
      paymentRequested: true,
      paymentApproved: true,
      paymentRejected: true,
      documentUploaded: true,
      contractExpiring: true,
      emailNotifications: true
    }
  });

  // Загрузка специалистов и информации о текущем пользователе
  useEffect(() => {
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // При получении информации о текущем пользователе загружаем специалистов его отдела
  useEffect(() => {
    if (currentUser?.department) {
      fetchDepartmentSpecialists(currentUser.department);
    }
  }, [currentUser]);
  
  // Фильтрация специалистов по поисковому запросу
  useEffect(() => {
    if (specialists.length > 0) {
      const filtered = specialists.filter(specialist => {
        const fullName = `${specialist.firstName} ${specialist.lastName}`.toLowerCase();
        const email = specialist.email.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
      
      setFilteredSpecialists(filtered);
    }
  }, [searchTerm, specialists]);

  // Получение информации о текущем пользователе
  const fetchCurrentUser = async () => {
    try {
      const response = await graphqlClient.request<CurrentUserResponse>(CURRENT_USER_QUERY);
      if (response.currentUser) {
        setCurrentUser(response.currentUser);
      }
    } catch (error) {
      console.error('Ошибка при получении данных текущего пользователя:', error);
      toast.error('Не удалось загрузить информацию о пользователе');
    }
  };
  
  // Загрузка специалистов отдела
  const fetchDepartmentSpecialists = async (department: string) => {
    setLoading(true);
    try {
      const response = await graphqlClient.request<DepartmentSpecialistsResponse>(
        GET_DEPARTMENT_SPECIALISTS_QUERY,
        { department }
      );
      
      if (response && response.departmentSpecialists) {
        setSpecialists(response.departmentSpecialists);
        setFilteredSpecialists(response.departmentSpecialists);
      } else {
        setSpecialists([]);
        setFilteredSpecialists([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке сотрудников отдела:', error);
      toast.error('Не удалось загрузить список сотрудников');
      setSpecialists([]);
      setFilteredSpecialists([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Обработка отправки формы настроек уведомлений
  const onSubmitNotificationSettings = async (data: NotificationSettingsFormValues) => {
    if (!currentUser?.department) return;
    
    setIsSubmitting(true);
    try {
      const response = await graphqlClient.request(SET_DEPARTMENT_NOTIFICATIONS_MUTATION, {
        department: currentUser.department,
        input: data
      });
      
      if (response.setDepartmentNotifications.success) {
        toast.success(`Настройки уведомлений обновлены для ${response.setDepartmentNotifications.affectedUsers} сотрудников`);
      } else {
        throw new Error(response.setDepartmentNotifications.message);
      }
    } catch (error: any) {
      console.error('Ошибка при обновлении настроек уведомлений:', error);
      toast.error('Не удалось обновить настройки уведомлений');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработка клика по специалисту
  const handleSpecialistClick = (specialist: User) => {
    setSelectedSpecialist(specialist);
  };
  
  // Получение инициалов из имени пользователя
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Управление командой</h1>
          <p className="text-gray-500">
            Департамент: {currentUser?.department || 'Загрузка...'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Левая колонка - список специалистов */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Специалисты отдела
              </CardTitle>
              <CardDescription>
                {loading ? 'Загрузка...' : `Всего специалистов: ${specialists.length}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Поиск специалиста..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4"
                  />
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {loading ? (
                    <div className="py-4 text-center text-gray-500">
                      <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                      Загрузка специалистов...
                    </div>
                  ) : filteredSpecialists.length === 0 ? (
                    <div className="py-4 text-center text-gray-500">
                      {searchTerm 
                        ? 'Специалисты не найдены по запросу' 
                        : 'В вашем отделе нет специалистов'}
                    </div>
                  ) : (
                    filteredSpecialists.map((specialist) => (
                      <div 
                        key={specialist.id}
                        className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                          selectedSpecialist?.id === specialist.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                        onClick={() => handleSpecialistClick(specialist)}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-blue-100 text-blue-800">
                            {getInitials(specialist.firstName, specialist.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {specialist.firstName} {specialist.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {specialist.email}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Правая колонка - детальная информация и настройки */}
        <div className="md:col-span-2">
          <Tabs defaultValue="specialist" className="h-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="specialist">
                <User className="mr-2 h-4 w-4" />
                Информация о специалисте
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Уведомления отдела
              </TabsTrigger>
            </TabsList>
            
            {/* Вкладка с информацией о выбранном специалисте */}
            <TabsContent value="specialist" className="space-y-4">
              {selectedSpecialist ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <Avatar className="h-14 w-14 mr-4">
                          <AvatarFallback className="bg-blue-100 text-blue-800 text-lg">
                            {getInitials(selectedSpecialist.firstName, selectedSpecialist.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-xl">
                            {selectedSpecialist.firstName} {selectedSpecialist.lastName}
                          </CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <Mail className="h-4 w-4 mr-1" />
                            {selectedSpecialist.email}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-700">
                            {getSpecialistStats(selectedSpecialist.id).suppliers}
                          </p>
                          <p className="text-sm text-blue-700">Поставщики</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-700">
                            {getSpecialistStats(selectedSpecialist.id).contracts}
                          </p>
                          <p className="text-sm text-green-700">Контракты</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-700">
                            {getSpecialistStats(selectedSpecialist.id).payments}
                          </p>
                          <p className="text-sm text-amber-700">Платежи</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-700">
                            {getSpecialistStats(selectedSpecialist.id).documents}
                          </p>
                          <p className="text-sm text-purple-700">Документы</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Последняя активность</CardTitle>
                      <CardDescription>
                        Последние действия специалиста в системе
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Дата</TableHead>
                            <TableHead>Действие</TableHead>
                            <TableHead>Объект</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSpecialistStats(selectedSpecialist.id).activity.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.date}</TableCell>
                              <TableCell>{item.action}</TableCell>
                              <TableCell>{item.entity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button variant="link" className="mt-2 w-full" onClick={() => router.push('/admin/audit-logs')}>
                        Просмотреть полную историю в журнале аудита
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                    <User className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium">Выберите специалиста</h3>
                    <p className="text-gray-500 max-w-sm mt-2">
                      Выберите специалиста из списка слева для просмотра подробной информации и статистики
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Вкладка с настройками уведомлений отдела */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    Настройки уведомлений отдела
                  </CardTitle>
                  <CardDescription>
                    Настройте какие уведомления будут получать все сотрудники вашего отдела
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmitNotificationSettings)}>
                    <div className="space-y-6">
                      <Accordion type="single" collapsible defaultValue="supplier" className="w-full">
                        <AccordionItem value="supplier">
                          <AccordionTrigger>Уведомления о поставщиках</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="supplierCreated" className="text-base">Создание поставщика</Label>
                                  <p className="text-sm text-gray-500">Уведомления о создании новых поставщиков</p>
                                </div>
                                <Switch id="supplierCreated" {...register('supplierCreated')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="supplierApproved" className="text-base">Утверждение поставщика</Label>
                                  <p className="text-sm text-gray-500">Уведомления об утверждении поставщиков</p>
                                </div>
                                <Switch id="supplierApproved" {...register('supplierApproved')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="supplierRejected" className="text-base">Отклонение поставщика</Label>
                                  <p className="text-sm text-gray-500">Уведомления об отклонении поставщиков</p>
                                </div>
                                <Switch id="supplierRejected" {...register('supplierRejected')} />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="contract">
                          <AccordionTrigger>Уведомления о контрактах</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="contractCreated" className="text-base">Создание контракта</Label>
                                  <p className="text-sm text-gray-500">Уведомления о создании новых контрактов</p>
                                </div>
                                <Switch id="contractCreated" {...register('contractCreated')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="contractApproved" className="text-base">Утверждение контракта</Label>
                                  <p className="text-sm text-gray-500">Уведомления об утверждении контрактов</p>
                                </div>
                                <Switch id="contractApproved" {...register('contractApproved')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="contractRejected" className="text-base">Отклонение контракта</Label>
                                  <p className="text-sm text-gray-500">Уведомления об отклонении контрактов</p>
                                </div>
                                <Switch id="contractRejected" {...register('contractRejected')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="contractExpiring" className="text-base">Истечение срока контракта</Label>
                                  <p className="text-sm text-gray-500">Уведомления об истекающих контрактах</p>
                                </div>
                                <Switch id="contractExpiring" {...register('contractExpiring')} />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="payment">
                          <AccordionTrigger>Уведомления о платежах</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="paymentRequested" className="text-base">Запрос платежа</Label>
                                  <p className="text-sm text-gray-500">Уведомления о запросе новых платежей</p>
                                </div>
                                <Switch id="paymentRequested" {...register('paymentRequested')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="paymentApproved" className="text-base">Утверждение платежа</Label>
                                  <p className="text-sm text-gray-500">Уведомления об утверждении платежей</p>
                                </div>
                                <Switch id="paymentApproved" {...register('paymentApproved')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="paymentRejected" className="text-base">Отклонение платежа</Label>
                                  <p className="text-sm text-gray-500">Уведомления об отклонении платежей</p>
                                </div>
                                <Switch id="paymentRejected" {...register('paymentRejected')} />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="document">
                          <AccordionTrigger>Прочие уведомления</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="documentUploaded" className="text-base">Загрузка документа</Label>
                                  <p className="text-sm text-gray-500">Уведомления о загрузке новых документов</p>
                                </div>
                                <Switch id="documentUploaded" {...register('documentUploaded')} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="emailNotifications" className="text-base">Email-уведомления</Label>
                                  <p className="text-sm text-gray-500">Дублировать уведомления по электронной почте</p>
                                </div>
                                <Switch id="emailNotifications" {...register('emailNotifications')} />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Информация о настройках</p>
                            <p className="text-xs text-blue-700 mt-1">
                              Эти настройки применяются ко всем специалистам вашего отдела.
                              Индивидуальные настройки уведомлений могут быть изменены каждым специалистом в своем профиле.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <CardFooter className="flex justify-end space-x-2 mt-6 px-0">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Сохранение...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить настройки
                          </div>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
