'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { graphqlClient } from '@/lib/auth';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader, X, Check, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GET_SUPPLIERS_QUERY } from '@/lib/graphql/queries';
import { CREATE_CONTRACT_MUTATION } from '@/lib/graphql/mutations';

// Тип для поставщика
type Supplier = {
  id: string;
  name: string;
  email: string;
  status: string;
};

// Тип ответа GraphQL для запроса поставщиков
type GetSuppliersResponse = {
  suppliers: {
    items: Supplier[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

// Схема валидации Zod для формы
const contractFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long' }).max(100, { message: 'Title must be less than 100 characters long' }),
  supplierId: z.string({ required_error: 'Supplier is required' }),
  contractNumber: z.string().min(3, { message: 'Contract number must be at least 3 characters long' }).max(50, { message: 'Contract number must be less than 50 characters long' }),
  description: z.string().max(1000, { message: 'Description must be less than 1000 characters long' }).optional(),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  value: z.coerce.number().positive({ message: 'Value must be a positive number' }),
  currency: z.string().min(1, { message: 'Currency is required' }).default('USD'),
  terms: z.string().max(2000, { message: 'Terms must be less than 2000 characters long' }).optional(),
  paymentTerms: z.string().max(1000, { message: 'Payment terms must be less than 1000 characters long' }).optional(),
  deliveryTerms: z.string().max(1000, { message: 'Delivery terms must be less than 1000 characters long' }).optional(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Тип для формы
type ContractFormValues = z.infer<typeof contractFormSchema>;

// Список валют
const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'RUB', name: 'Russian Ruble' },
];

export default function CreateContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const initialSupplierId = searchParams.get('supplierId');

  // Настройка react-hook-form с Zod валидацией
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      currency: 'USD',
      startDate: new Date(),
      endDate: addDays(new Date(), 90), // По умолчанию 90 дней
      supplierId: initialSupplierId || '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Загрузка списка поставщиков
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const response = await graphqlClient.request<GetSuppliersResponse>(GET_SUPPLIERS_QUERY, {
          pagination: {
            page: 1,
            limit: 100, // Загружаем больше поставщиков, чтобы было из чего выбрать
          },
          filter: {
            status: 'APPROVED', // Фильтруем только подтвержденных поставщиков
          },
        });

        if (response && response.suppliers && response.suppliers.items) {
          setSuppliers(response.suppliers.items);
        }
      } catch (error: any) {
        console.error('Error fetching suppliers:', error);
        const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to load suppliers';
        toast.error(errorMessage);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Обработчик отправки формы
  const onSubmit = async (data: ContractFormValues) => {
    setIsSubmitting(true);

    try {
      // Преобразование данных формы в формат для GraphQL мутации
      const input = {
        ...data,
        description: data.description || null,
        terms: data.terms || null,
        paymentTerms: data.paymentTerms || null,
        deliveryTerms: data.deliveryTerms || null,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        // Преобразуем числовые значения
        value: Math.round(data.value * 100) / 100, // Округляем до 2 знаков после запятой
      };

      const response = await graphqlClient.request(CREATE_CONTRACT_MUTATION, {
        input,
      });

      toast.success('Contract created successfully');
      
      // Редирект на страницу созданного контракта
      if (response.createContract?.id) {
        router.push(`/admin/contracts/${response.createContract.id}`);
      } else {
        router.push('/admin/contracts');
      }
    } catch (error: any) {
      console.error('Error creating contract:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to create contract';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция форматирования для отображения даты
  const formatDate = (date: Date) => {
    return format(date, 'PPP');
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/contracts')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Create New Contract</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Основная информация о контракте */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the contract's essential details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Название контракта */}
              <div className="space-y-2">
                <Label htmlFor="title">Contract Title <span className="text-red-500">*</span></Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Supply of Office Equipment" 
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Номер контракта */}
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Contract Number <span className="text-red-500">*</span></Label>
                <Input 
                  id="contractNumber" 
                  placeholder="e.g. CNT-2025-001" 
                  {...register('contractNumber')}
                />
                {errors.contractNumber && (
                  <p className="text-sm text-red-500">{errors.contractNumber.message}</p>
                )}
              </div>

              {/* Выбор поставщика */}
              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier <span className="text-red-500">*</span></Label>
                {loadingSuppliers ? (
                  <div className="flex items-center h-10 border rounded-md px-3 py-2 text-sm bg-muted">
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    <span>Loading suppliers...</span>
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name="supplierId"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No approved suppliers available
                            </div>
                          ) : (
                            suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.supplierId && (
                  <p className="text-sm text-red-500">{errors.supplierId.message}</p>
                )}
              </div>

              {/* Стоимость контракта */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="value">Contract Value <span className="text-red-500">*</span></Label>
                  <Input 
                    id="value" 
                    type="number" 
                    placeholder="Enter contract value" 
                    step="0.01"
                    min="0"
                    {...register('value')}
                  />
                  {errors.value && (
                    <p className="text-sm text-red-500">{errors.value.message}</p>
                  )}
                </div>

                {/* Валюта */}
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
                  <Controller
                    control={control}
                    name="currency"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.currency && (
                    <p className="text-sm text-red-500">{errors.currency.message}</p>
                  )}
                </div>
              </div>

              {/* Описание */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Brief description of the contract" 
                  rows={3}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Даты и условия */}
          <Card>
            <CardHeader>
              <CardTitle>Dates & Terms</CardTitle>
              <CardDescription>Define contract duration and conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Дата начала */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value) : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate.message}</p>
                )}
              </div>

              {/* Дата окончания */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value) : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate.message}</p>
                )}
              </div>

              {/* Условия контракта */}
              <div className="space-y-2">
                <Label htmlFor="terms">Contract Terms</Label>
                <Textarea 
                  id="terms" 
                  placeholder="General terms and conditions" 
                  rows={4}
                  {...register('terms')}
                />
                {errors.terms && (
                  <p className="text-sm text-red-500">{errors.terms.message}</p>
                )}
              </div>

              {/* Условия оплаты */}
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Textarea 
                  id="paymentTerms" 
                  placeholder="E.g. Payment schedule, milestones" 
                  rows={2}
                  {...register('paymentTerms')}
                />
                {errors.paymentTerms && (
                  <p className="text-sm text-red-500">{errors.paymentTerms.message}</p>
                )}
              </div>

              {/* Условия доставки */}
              <div className="space-y-2">
                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                <Textarea 
                  id="deliveryTerms" 
                  placeholder="E.g. Delivery schedule, methods" 
                  rows={2}
                  {...register('deliveryTerms')}
                />
                {errors.deliveryTerms && (
                  <p className="text-sm text-red-500">{errors.deliveryTerms.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Кнопки действий */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/contracts')}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <Button 
            type="submit"
            disabled={isSubmitting || loadingSuppliers}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Contract
              </>
            )}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
