'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { graphqlClient } from '@/lib/auth';
import { CREATE_CONTRACT_MUTATION } from '@/lib/graphql/mutations';
import { ContractInput } from '@/lib/graphql/types';

// Определяем валидационную схему для формы создания контракта
const contractFormSchema = z.object({
  title: z.string().min(3, {
    message: 'Название контракта должно содержать не менее 3 символов',
  }),
  supplierId: z.string({
    required_error: 'Выберите поставщика',
  }),
  contractNumber: z.string().min(3, {
    message: 'Номер контракта должен содержать не менее 3 символов',
  }),
  description: z.string().optional(),
  startDate: z.date({
    required_error: 'Укажите дату начала контракта',
  }),
  endDate: z.date({
    required_error: 'Укажите дату окончания контракта',
  }),
  value: z.coerce.number().positive({
    message: 'Стоимость контракта должна быть положительным числом',
  }),
  currency: z.string().default('USD'),
  terms: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
}).refine(data => {
  return data.endDate > data.startDate;
}, {
  message: 'Дата окончания должна быть позже даты начала',
  path: ['endDate'],
});

type Supplier = {
  id: string;
  name: string;
};

const currencies = [
  { value: 'USD', label: 'USD - Доллар США' },
  { value: 'EUR', label: 'EUR - Евро' },
  { value: 'GBP', label: 'GBP - Фунт стерлингов' },
  { value: 'JPY', label: 'JPY - Японская йена' },
  { value: 'CNY', label: 'CNY - Китайский юань' },
  { value: 'RUB', label: 'RUB - Российский рубль' },
];

export default function CreateContractPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Инициализация формы с настройками валидации
  const form = useForm<z.infer<typeof contractFormSchema>>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: '',
      contractNumber: '',
      description: '',
      value: 0,
      currency: 'USD',
      terms: '',
      paymentTerms: '',
      deliveryTerms: '',
    },
  });

  // Загрузка списка поставщиков при монтировании компонента
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const query = `
          query GetApprovedSuppliers($pagination: PaginationInput, $filter: SupplierFilterInput) {
            suppliers(pagination: $pagination, filter: $filter) {
              items {
                id
                name
              }
            }
          }
        `;
        
        const { suppliers } = await graphqlClient.request<{ suppliers: { items: Supplier[] } }>(
          query,
          { 
            pagination: { page: 1, limit: 100 },
            filter: { status: 'APPROVED' } 
          }
        );
        
        setSuppliers(suppliers.items);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.error('Не удалось загрузить список поставщиков');
      } finally {
        setLoadingSuppliers(false);
      }
    };
    
    fetchSuppliers();
  }, []);

  // Отправка формы
  const onSubmit = async (data: z.infer<typeof contractFormSchema>) => {
    setLoading(true);
    try {
      console.log('Данные формы перед отправкой:', data); // Отладочный вывод
      
      // Форматирование дат в строки YYYY-MM-DD
      // Проверяем, что даты являются объектами Date перед форматированием
      const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
      const endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
      
      // Убеждаемся, что даты валидны
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Неверный формат даты. Используйте формат YYYY-MM-DD');
      }
      
      // Строго в формате YYYY-MM-DD без времени и часового пояса
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      console.log('Форматированные даты:', { startDate: startDateStr, endDate: endDateStr }); // Отладочный вывод
      
      // Подготовка данных для отправки на сервер
      const contractInput = {
        title: data.title,
        supplierId: data.supplierId,
        contractNumber: data.contractNumber,
        description: data.description || "",
        startDate: startDateStr,
        endDate: endDateStr,
        value: data.value,
        currency: data.currency,
        terms: data.terms || "",
        paymentTerms: data.paymentTerms || "",
        deliveryTerms: data.deliveryTerms || "",
      };
      
      console.log('Отправляемый объект:', contractInput); // Отладочный вывод

      // Выполнение мутации для создания контракта
      const { createContract } = await graphqlClient.request<{ createContract: any }>(
        CREATE_CONTRACT_MUTATION,
        { input: contractInput }
      );

      toast.success('Контракт успешно создан');
      router.push(`/specialist/contracts/${createContract.id}`);
    } catch (error: any) {
      console.error('Error creating contract:', error);
      // Более подробное отображение ошибки
      toast.error(error.message || 'Ошибка при создании контракта', {
        description: error.response?.errors?.[0]?.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Создание нового контракта</h1>
          <p className="text-gray-500">Заполните информацию для создания контракта с поставщиком</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Назад
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о контракте</CardTitle>
          <CardDescription>
            Введите основные данные контракта, условия и сроки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Основная информация</TabsTrigger>
                  <TabsTrigger value="terms">Условия контракта</TabsTrigger>
                </TabsList>
              
                <TabsContent value="basic" className="space-y-4">
                  {/* Выбор поставщика */}
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Поставщик</FormLabel>
                        <Select
                          disabled={loadingSuppliers}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingSuppliers ? "Загрузка поставщиков..." : "Выберите поставщика"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Выберите поставщика, с которым заключается контракт
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Название контракта */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название контракта</FormLabel>
                        <FormControl>
                          <Input placeholder="Введите название контракта" {...field} />
                        </FormControl>
                        <FormDescription>
                          Укажите информативное название для контракта
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Номер контракта */}
                  <FormField
                    control={form.control}
                    name="contractNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Номер контракта</FormLabel>
                        <FormControl>
                          <Input placeholder="Например, CONT-2025-001" {...field} />
                        </FormControl>
                        <FormDescription>
                          Введите уникальный номер контракта согласно вашей системе нумерации
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Стоимость и валюта */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Стоимость контракта</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Валюта</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите валюту" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map((currency) => (
                                <SelectItem key={currency.value} value={currency.value}>
                                  {currency.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Даты начала и окончания */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Дата начала</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd.MM.yyyy")
                                  ) : (
                                    <span>Выберите дату</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Дата окончания</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd.MM.yyyy")
                                  ) : (
                                    <span>Выберите дату</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => 
                                  form.getValues().startDate && date < form.getValues().startDate
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Описание контракта */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Введите описание контракта"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Краткое описание предмета контракта и его целей
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="terms" className="space-y-4">
                  {/* Общие условия */}
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Общие условия</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Введите общие условия контракта"
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Основные условия, обязательства сторон, ответственность и т.д.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Условия оплаты */}
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Условия оплаты</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Введите условия оплаты"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Сроки оплаты, размеры платежей, предоплата, отсрочка и т.д.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Условия доставки */}
                  <FormField
                    control={form.control}
                    name="deliveryTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Условия доставки</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Введите условия доставки"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Сроки, способы доставки, инкотермс и т.д.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => router.back()}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать контракт
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
