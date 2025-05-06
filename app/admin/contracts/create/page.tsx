'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'
import { gql } from 'graphql-request'
import { useMutation, useQuery } from '@tanstack/react-query'
import { graphqlClient } from '@/lib/graphql-client'
import { format, addDays, isAfter } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, ChevronLeftIcon, InfoIcon, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Типы данных
interface Supplier {
  id: string
  name: string
  legalName: string
  status: string
}

interface SuppliersResponse {
  items: Supplier[]
}

// Схема валидации формы создания контракта
const contractSchema = z.object({
  title: z.string().min(3, 'Название должно содержать не менее 3 символов'),
  contractNumber: z.string().min(3, 'Номер контракта должен содержать не менее 3 символов'),
  description: z.string().optional(),
  supplierId: z.string({ required_error: 'Необходимо выбрать поставщика' }),
  startDate: z.date({ required_error: 'Необходимо указать дату начала' }),
  endDate: z.date({ required_error: 'Необходимо указать дату окончания' }),
  value: z.number({ required_error: 'Необходимо указать стоимость' })
    .positive('Стоимость должна быть положительным числом'),
  currency: z.string({ required_error: 'Необходимо выбрать валюту' }),
  terms: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
})
.refine(
  (data) => isAfter(data.endDate, data.startDate),
  {
    message: 'Дата окончания должна быть после даты начала',
    path: ['endDate'],
  }
)

type ContractFormValues = z.infer<typeof contractSchema>

// Запрос для получения списка поставщиков
const GET_SUPPLIERS = gql`
  query GetSuppliers($page: Int!, $limit: Int!, $status: SupplierStatus) {
    suppliers(
      pagination: { page: $page, limit: $limit }
      filter: { status: $status }
    ) {
      items {
        id
        name
        legalName
        status
      }
    }
  }
`

// Мутация для создания контракта
const CREATE_CONTRACT = gql`
  mutation CreateContract($input: ContractInput!) {
    createContract(input: $input) {
      id
      title
      contractNumber
      status
    }
  }
`

export default function CreateContractPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Инициализация формы
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      title: '',
      contractNumber: '',
      description: '',
      supplierId: '',
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      value: 0,
      currency: 'RUB',
      terms: '',
      paymentTerms: '',
      deliveryTerms: '',
    },
  })

  // Запрос на получение списка поставщиков
  const { data: suppliersData, isLoading: suppliersLoading, error: suppliersError } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const response = await graphqlClient.request<{ suppliers: SuppliersResponse }>(GET_SUPPLIERS, {
          page: 1,
          limit: 100,
          status: 'APPROVED', // Получаем только утвержденных поставщиков
        })
        
        // Проверяем что данные существуют
        if (!response || !response.suppliers) {
          throw new Error('Получен некорректный ответ от сервера')
        }
        
        return response.suppliers
      } catch (error: any) {
        console.error('Error fetching suppliers:', error)
        toast({
          title: 'Ошибка загрузки поставщиков',
          description: error.message || 'Не удалось загрузить список поставщиков. Пожалуйста, попробуйте еще раз.',
          variant: 'destructive',
        })
        // Возвращаем пустой массив, чтобы избежать ошибки при рендере
        return { items: [] }
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // Кэшируем на 5 минут, чтобы избежать частых запросов
  })

  // Мутация для создания контракта
  const createContractMutation = useMutation({
    mutationFn: async (values: ContractFormValues) => {
      const response = await graphqlClient.request(CREATE_CONTRACT, {
        input: {
          title: values.title,
          contractNumber: values.contractNumber,
          description: values.description || '',
          supplierId: values.supplierId,
          // Используем простой формат даты YYYY-MM-DD вместо ISO строки
          startDate: format(values.startDate, 'yyyy-MM-dd'),
          endDate: format(values.endDate, 'yyyy-MM-dd'),
          value: values.value,
          currency: values.currency,
          terms: values.terms || '',
          paymentTerms: values.paymentTerms || '',
          deliveryTerms: values.deliveryTerms || '',
        },
      })
      return response
    },
    onSuccess: (data) => {
      toast({
        title: 'Контракт успешно создан',
        description: `Контракт "${data.createContract.title}" был успешно добавлен в систему.`,
      })
      router.push('/admin/contracts')
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка при создании контракта',
        description: error.message || 'Произошла ошибка при создании контракта. Пожалуйста, попробуйте еще раз.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    },
  })

  // Отправка формы
  const onSubmit = (values: ContractFormValues) => {
    setIsSubmitting(true)
    createContractMutation.mutate(values)
  }

  return (
    <DashboardLayout>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2"
          onClick={() => router.push('/admin/contracts')}
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold">Создание нового контракта</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о контракте</CardTitle>
          <CardDescription>
            Заполните данные для создания нового контракта с поставщиком
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Input placeholder="Например: C-2025-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Поставщик */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Поставщик</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите поставщика" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliersLoading ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Загрузка поставщиков...
                            </div>
                          ) : suppliersData?.items?.length === 0 ? (
                            <div className="p-2 text-center text-gray-500">
                              Поставщики не найдены
                            </div>
                          ) : (
                            suppliersData?.items.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name} ({supplier.legalName})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Стоимость */}
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Стоимость</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="w-[120px]">
                        <FormLabel>Валюта</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Валюта" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="RUB">₽ (RUB)</SelectItem>
                            <SelectItem value="USD">$ (USD)</SelectItem>
                            <SelectItem value="EUR">€ (EUR)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Дата начала */}
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
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'dd.MM.yyyy', { locale: ru })
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
                            disabled={(date) => date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Дата окончания */}
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
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'dd.MM.yyyy', { locale: ru })
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
                            disabled={(date) => date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Описание */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишите детали контракта"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Общие условия */}
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Общие условия</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Общие условия контракта"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
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
                          placeholder="Опишите условия оплаты"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Условия поставки */}
                <FormField
                  control={form.control}
                  name="deliveryTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Условия поставки</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Опишите условия поставки"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/contracts')}
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать контракт
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <InfoIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Подсказка</h3>
            <p className="text-sm text-blue-700">
              После создания контракта вы сможете добавить к нему документы и назначить платежи.
              Контракт будет создан со статусом Черновик и потребует дальнейшего утверждения.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
