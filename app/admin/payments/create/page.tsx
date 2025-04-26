'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { graphqlClient } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CREATE_PAYMENT_MUTATION } from '@/lib/graphql/mutations';
import { GET_SUPPLIERS_QUERY, GET_CONTRACTS_QUERY } from '@/lib/graphql/queries';
import { Loader, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';

// Типы данных
type Supplier = {
  id: string;
  name: string;
  status: string;
};

type Contract = {
  id: string;
  title: string;
  contractNumber: string;
  supplier: {
    id: string;
    name: string;
  };
  status: string;
};

type SupplierResponse = {
  suppliers: {
    items: Supplier[];
    total: number;
  };
};

type ContractResponse = {
  contracts: {
    items: Contract[];
    total: number;
  };
};

// Схема валидации формы
const paymentSchema = z.object({
  supplierId: z.string().min(1, { message: 'Поставщик обязателен' }),
  contractId: z.string().optional(),
  amount: z.number().positive({ message: 'Сумма должна быть положительным числом' }),
  currency: z.string().min(1, { message: 'Валюта обязательна' }),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.date().optional(),
  dueDate: z.date().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function CreatePaymentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [supplierContracts, setSupplierContracts] = useState<Contract[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);

  // Настройка формы с react-hook-form и zod
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      currency: 'RUB',
    },
  });

  // Отслеживаем изменение выбранного поставщика
  const selectedSupplierId = watch('supplierId');

  // Загрузка списка поставщиков
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true);
      try {
        const response = await graphqlClient.request<SupplierResponse>(GET_SUPPLIERS_QUERY, {
          pagination: { limit: 100 },
          filter: { status: 'APPROVED' },
        });

        if (response && response.suppliers) {
          setSuppliers(response.suppliers.items);
        }
      } catch (error) {
        console.error('Ошибка при загрузке поставщиков:', error);
        toast.error('Не удалось загрузить список поставщиков');
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Загрузка списка контрактов
  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        const response = await graphqlClient.request<ContractResponse>(GET_CONTRACTS_QUERY, {
          pagination: { limit: 100 },
          filter: { status: 'ACTIVE' },
        });

        if (response && response.contracts) {
          setContracts(response.contracts.items);
        }
      } catch (error) {
        console.error('Ошибка при загрузке контрактов:', error);
        toast.error('Не удалось загрузить список контрактов');
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, []);

  // Фильтрация контрактов по выбранному поставщику
  useEffect(() => {
    if (selectedSupplierId) {
      const filteredContracts = contracts.filter(
        (contract) => contract.supplier.id === selectedSupplierId
      );
      setSupplierContracts(filteredContracts);
      
      // Сбрасываем выбранный контракт, если он не принадлежит новому выбранному поставщику
      setValue('contractId', undefined);
    } else {
      setSupplierContracts([]);
    }
  }, [selectedSupplierId, contracts, setValue]);

  // Отправка формы
  const onSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      // Преобразуем даты в ISO строки
      const formattedData = {
        ...data,
        invoiceDate: data.invoiceDate ? data.invoiceDate.toISOString() : undefined,
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        // Если контракт не выбран, устанавливаем его как null
        contractId: data.contractId || null,
      };

      await graphqlClient.request(CREATE_PAYMENT_MUTATION, {
        input: formattedData,
      });

      toast.success('Платеж успешно создан');
      router.push('/admin/payments');
    } catch (error: any) {
      console.error('Ошибка при создании платежа:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Не удалось создать платеж';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Создание нового платежа</h1>
          <p className="text-gray-500">Заполните информацию о платеже</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/payments')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          К списку платежей
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о платеже</CardTitle>
          <CardDescription>
            Заполните данные платежа. Поля, отмеченные звездочкой (*), обязательны для заполнения.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Основная информация о платеже */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Выбор поставщика */}
              <div className="space-y-2">
                <Label htmlFor="supplierId">
                  Поставщик <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoadingSuppliers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите поставщика" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {isLoadingSuppliers ? (
                            <SelectItem value="loading" disabled>
                              Загрузка...
                            </SelectItem>
                          ) : suppliers.length > 0 ? (
                            suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="empty" disabled>
                              Нет доступных поставщиков
                            </SelectItem>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.supplierId && (
                  <p className="text-sm text-red-500">{errors.supplierId.message}</p>
                )}
              </div>

              {/* Выбор контракта (необязательно) */}
              <div className="space-y-2">
                <Label htmlFor="contractId">Контракт</Label>
                <Controller
                  control={control}
                  name="contractId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoadingContracts || !selectedSupplierId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedSupplierId ? "Выберите контракт (необязательно)" : "Сначала выберите поставщика"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {isLoadingContracts ? (
                            <SelectItem value="loading" disabled>
                              Загрузка...
                            </SelectItem>
                          ) : supplierContracts.length > 0 ? (
                            supplierContracts.map((contract) => (
                              <SelectItem key={contract.id} value={contract.id}>
                                {contract.contractNumber} - {contract.title}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="empty" disabled>
                              {selectedSupplierId ? "Нет активных контрактов для этого поставщика" : "Сначала выберите поставщика"}
                            </SelectItem>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.contractId && (
                  <p className="text-sm text-red-500">{errors.contractId.message}</p>
                )}
              </div>
            </div>

            {/* Сумма и валюта */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Сумма <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="10000"
                  {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Валюта <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите валюту" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RUB">RUB - Российский рубль</SelectItem>
                        <SelectItem value="USD">USD - Доллар США</SelectItem>
                        <SelectItem value="EUR">EUR - Евро</SelectItem>
                        <SelectItem value="CNY">CNY - Китайский юань</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.currency && (
                  <p className="text-sm text-red-500">{errors.currency.message}</p>
                )}
              </div>
            </div>

            {/* Номер счета и даты */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Номер счета/инвойса</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="INV-12345"
                  {...register("invoiceNumber")}
                />
                {errors.invoiceNumber && (
                  <p className="text-sm text-red-500">{errors.invoiceNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Дата счета</Label>
                <Controller
                  control={control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'dd.MM.yyyy') : 'Выберите дату'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ru}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.invoiceDate && (
                  <p className="text-sm text-red-500">{errors.invoiceDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Срок оплаты</Label>
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'dd.MM.yyyy') : 'Выберите дату'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ru}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.dueDate && (
                  <p className="text-sm text-red-500">{errors.dueDate.message}</p>
                )}
              </div>
            </div>

            {/* Описание платежа */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                placeholder="Введите описание платежа или цель платежа"
                {...register("description")}
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/payments')}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать платеж'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
