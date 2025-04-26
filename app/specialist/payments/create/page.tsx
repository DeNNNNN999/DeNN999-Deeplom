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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { graphqlClient } from '@/lib/auth';
import { CREATE_PAYMENT_MUTATION } from '@/lib/graphql/mutations';
import { PaymentInput } from '@/lib/graphql/types';

// Определяем валидационную схему для формы создания платежа
const paymentFormSchema = z.object({
  supplierId: z.string({
    required_error: 'Выберите поставщика',
  }),
  contractId: z.string().optional(),
  amount: z.coerce.number().positive({
    message: 'Сумма платежа должна быть положительным числом',
  }),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.date().optional(),
  dueDate: z.date().optional(),
}).refine((data) => {
  // Если указан инвойс, должна быть указана и дата инвойса
  if (data.invoiceNumber && !data.invoiceDate) {
    return false;
  }
  return true;
}, {
  message: 'При указании номера инвойса необходимо указать дату инвойса',
  path: ['invoiceDate'],
});

type Supplier = {
  id: string;
  name: string;
};

type Contract = {
  id: string;
  title: string;
  contractNumber: string;
  supplierId: string;
};

const currencies = [
  { value: 'USD', label: 'USD - Доллар США' },
  { value: 'EUR', label: 'EUR - Евро' },
  { value: 'GBP', label: 'GBP - Фунт стерлингов' },
  { value: 'JPY', label: 'JPY - Японская йена' },
  { value: 'CNY', label: 'CNY - Китайский юань' },
  { value: 'RUB', label: 'RUB - Российский рубль' },
];

export default function CreatePaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Инициализация формы с настройками валидации
  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      currency: 'USD',
      description: '',
      invoiceNumber: '',
    },
  });

  // Отслеживаем изменение выбранного поставщика для фильтрации контрактов
  const selectedSupplierId = form.watch('supplierId');
  
  useEffect(() => {
    if (selectedSupplierId) {
      const filtered = contracts.filter(contract => contract.supplierId === selectedSupplierId);
      setFilteredContracts(filtered);
    } else {
      setFilteredContracts([]);
    }
  }, [selectedSupplierId, contracts]);

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

  // Загрузка контрактов
  useEffect(() => {
    const fetchContracts = async () => {
      setLoadingContracts(true);
      try {
        const query = `
          query GetActiveContracts($pagination: PaginationInput, $filter: ContractFilterInput) {
            contracts(pagination: $pagination, filter: $filter) {
              items {
                id
                title
                contractNumber
                supplier {
                  id
                }
              }
            }
          }
        `;
        
        const { contracts } = await graphqlClient.request<{ 
          contracts: { 
            items: Array<{
              id: string;
              title: string;
              contractNumber: string;
              supplier: { id: string };
            }> 
          } 
        }>(
          query,
          { 
            pagination: { page: 1, limit: 100 },
            filter: { status: 'ACTIVE' } 
          }
        );
        
        // Преобразование данных в удобный формат
        const formattedContracts = contracts.items.map(contract => ({
          id: contract.id,
          title: contract.title,
          contractNumber: contract.contractNumber,
          supplierId: contract.supplier.id
        }));
        
        setContracts(formattedContracts);
      } catch (error) {
        console.error('Error fetching contracts:', error);
        toast.error('Не удалось загрузить список контрактов');
      } finally {
        setLoadingContracts(false);
      }
    };
    
    fetchContracts();
  }, []);

  // Отправка формы
  const onSubmit = async (data: z.infer<typeof paymentFormSchema>) => {
    setLoading(true);
    try {
      // Подготовка данных для отправки на сервер
      const paymentInput: PaymentInput = {
        ...data,
        invoiceDate: data.invoiceDate?.toISOString(),
        dueDate: data.dueDate?.toISOString(),
      };

      // Выполнение мутации для создания платежа
      const { createPayment } = await graphqlClient.request<{ createPayment: any }>(
        CREATE_PAYMENT_MUTATION,
        { input: paymentInput }
      );

      toast.success('Платеж успешно создан');
      router.push(`/specialist/payments/${createPayment.id}`);
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Ошибка при создании платежа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Создание нового платежа</h1>
          <p className="text-gray-500">Заполните информацию для создания платежа поставщику</p>
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
          <CardTitle>Информация о платеже</CardTitle>
          <CardDescription>
            Введите данные для создания платежа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Выбор поставщика */}
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Поставщик</FormLabel>
                    <Select
                      disabled={loadingSuppliers}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Сбрасываем выбранный контракт при смене поставщика
                        form.setValue('contractId', undefined);
                      }}
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
                      Выберите поставщика, которому производится платеж
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Выбор контракта (опционально) */}
              <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Контракт (опционально)</FormLabel>
                    <Select
                      disabled={!selectedSupplierId || loadingContracts}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedSupplierId 
                              ? "Сначала выберите поставщика" 
                              : filteredContracts.length === 0 
                                ? "Нет доступных контрактов" 
                                : "Выберите контракт"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Исправлена ошибка: изменено пустое значение на "no-contract" */}
                        <SelectItem value="no-contract">Без привязки к контракту</SelectItem>
                        {filteredContracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.title} ({contract.contractNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      При необходимости, привяжите платеж к существующему контракту
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Сумма и валюта */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма платежа</FormLabel>
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

              {/* Номер инвойса */}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер инвойса (опционально)</FormLabel>
                    <FormControl>
                      <Input placeholder="Например, INV-2025-001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Введите номер инвойса или счета, если доступен
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Даты инвойса и платежа */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Дата инвойса</FormLabel>
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Срок оплаты</FormLabel>
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Описание платежа */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание (опционально)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Введите описание платежа"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Дополнительная информация о платеже
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  Создать платеж
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
