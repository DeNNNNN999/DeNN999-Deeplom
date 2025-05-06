'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { graphqlClient } from '@/lib/auth'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader, X, Building, Phone, Mail, Globe, FileText, User, Tag } from 'lucide-react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'

// GraphQL мутация для создания поставщика
const CREATE_SUPPLIER = `
  mutation CreateSupplier($input: SupplierInput!) {
    createSupplier(input: $input) {
      id
      name
      legalName
      taxId
      registrationNumber
      email
      phoneNumber
      status
    }
  }
`

// GraphQL запрос для получения категорий поставщиков
const GET_SUPPLIER_CATEGORIES = `
  query GetSupplierCategories($pagination: PaginationInput) {
    supplierCategories(pagination: $pagination) {
      items {
        id
        name
      }
      total
    }
  }
`

// Тип для категорий поставщиков
type SupplierCategory = {
  id: string
  name: string
}

// Схема валидации Zod для формы (с сообщениями на русском)
const supplierFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Название должно содержать не менее 2 символов' })
    .max(100, { message: 'Название должно быть короче 100 символов' }),
  legalName: z
    .string()
    .min(2, { message: 'Юридическое название должно содержать не менее 2 символов' })
    .max(100, { message: 'Юридическое название должно быть короче 100 символов' }),
  taxId: z
    .string()
    .min(5, { message: 'ИНН должен содержать не менее 5 символов' })
    .max(50, { message: 'ИНН должен быть короче 50 символов' }),
  registrationNumber: z
    .string()
    .min(5, { message: 'Регистрационный номер должен содержать не менее 5 символов' })
    .max(50, { message: 'Регистрационный номер должен быть короче 50 символов' }),
  address: z
    .string()
    .min(5, { message: 'Адрес должен содержать не менее 5 символов' })
    .max(200, { message: 'Адрес должен быть короче 200 символов' }),
  city: z
    .string()
    .min(2, { message: 'Название города должно содержать не менее 2 символов' })
    .max(100, { message: 'Название города должно быть короче 100 символов' }),
  state: z.string().optional(),
  country: z
    .string()
    .min(2, { message: 'Название страны должно содержать не менее 2 символов' })
    .max(100, { message: 'Название страны должно быть короче 100 символов' }),
  postalCode: z
    .string()
    .min(2, { message: 'Почтовый индекс должен содержать не менее 2 символов' })
    .max(20, { message: 'Почтовый индекс должен быть короче 20 символов' }),
  phoneNumber: z
    .string()
    .min(5, { message: 'Номер телефона должен содержать не менее 5 символов' })
    .max(20, { message: 'Номер телефона должен быть короче 20 символов' }),
  email: z.string().email({ message: 'Пожалуйста, введите корректный email-адрес' }),
  website: z.string().url({ message: 'Пожалуйста, введите корректный URL' }).optional().or(z.literal('')),
  notes: z.string().max(1000, { message: 'Примечания должны быть короче 1000 символов' }).optional(),
  contactPersonName: z
    .string()
    .min(2, { message: 'Имя контактного лица должно содержать не менее 2 символов' })
    .max(100, { message: 'Имя контактного лица должно быть короче 100 символов' }),
  contactPersonEmail: z.string().email({ message: 'Пожалуйста, введите корректный email-адрес контактного лица' }),
  contactPersonPhone: z
    .string()
    .min(5, { message: 'Номер телефона контактного лица должен содержать не менее 5 символов' })
    .max(20, { message: 'Номер телефона контактного лица должен быть короче 20 символов' }),
  categoryIds: z.array(z.string()).min(1, { message: 'Пожалуйста, выберите как минимум одну категорию' }),
})

// Тип для формы
type SupplierFormValues = z.infer<typeof supplierFormSchema>

export default function CreateSupplierPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<SupplierCategory[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Рефы для анимаций
  const formRef = useRef<HTMLFormElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<NodeListOf<Element> | null>(null)

  // Инициализация react-hook-form с Zod валидацией
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      legalName: '',
      taxId: '',
      registrationNumber: '',
      address: '',
      city: '',
      country: '',
      postalCode: '',
      phoneNumber: '',
      email: '',
      contactPersonName: '',
      contactPersonEmail: '',
      contactPersonPhone: '',
      categoryIds: [],
    },
  })

  // Наблюдение за выбранными категориями
  const selectedCategories = watch('categoryIds')

  // Загрузка категорий поставщиков
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('Начало загрузки категорий...');
        
        const response = await graphqlClient.request(GET_SUPPLIER_CATEGORIES, {
          pagination: { page: 1, limit: 100 } // Получаем до 100 категорий
        });
        
        console.log('Полученный ответ:', response);
        
        if (response?.supplierCategories?.items) {
          console.log('Найдено категорий:', response.supplierCategories.items.length);
          setCategories(response.supplierCategories.items);
          
          // Устанавливаем первую категорию по умолчанию, если она есть
          if (response.supplierCategories.items.length > 0) {
            const defaultCategory = response.supplierCategories.items[0].id;
            console.log('Устанавливаем категорию по умолчанию:', defaultCategory);
            setValue('categoryIds', [defaultCategory], { shouldValidate: true });
          } else {
            console.log('Нет доступных категорий');
          }
        } else {
          console.log('Нет данных о категориях в ответе');
        }
      } catch (error) {
        console.error('Ошибка загрузки категорий поставщиков:', error);
        toast.error('Не удалось загрузить категории поставщиков');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();

    // Анимации при загрузке страницы
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
    }

    // Получаем все карточки и анимируем их последовательно
    setTimeout(() => {
      cardsRef.current = document.querySelectorAll('.form-card')
      gsap.fromTo(
        cardsRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.15,
          duration: 0.6,
          ease: 'power2.out',
        },
      )
    }, 100)
  }, [])

  // Обработчик успешной отправки формы
  const onSubmit = async (data: SupplierFormValues) => {
    // Проверяем, что выбрана хотя бы одна категория
    if (!data.categoryIds || data.categoryIds.length === 0) {
      toast.error('Необходимо выбрать хотя бы одну категорию');
      return;
    }
    
    setIsSubmitting(true)

    // Анимация начала отправки
    gsap.to('.form-card', {
      opacity: 0.8,
      scale: 0.98,
      duration: 0.3,
      stagger: 0.05,
      ease: 'power2.inOut',
    })

    try {
      // Преобразование данных формы в формат для GraphQL мутации
      const input = {
        ...data,
        website: data.website || null,
        notes: data.notes || null,
        state: data.state || null,
      }

      const response = await graphqlClient.request(CREATE_SUPPLIER, {
        input,
      })

      toast.success('Поставщик успешно создан')

      // Анимация успешной отправки
      gsap.to('.form-card', {
        backgroundColor: 'rgba(80, 250, 123, 0.08)',
        borderColor: 'rgba(80, 250, 123, 0.3)',
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.inOut',
        onComplete: () => {
          // Редирект на страницу поставщика после создания
          if (response.createSupplier?.id) {
            router.push(`/admin/suppliers/${response.createSupplier.id}`)
          } else {
            router.push('/admin/suppliers')
          }
        },
      })
    } catch (error: any) {
      console.error('Ошибка создания поставщика:', error)
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Не удалось создать поставщика'
      toast.error(errorMessage)

      // Анимация ошибки
      gsap.to('.form-card', {
        backgroundColor: 'rgba(255, 85, 85, 0.08)',
        borderColor: 'rgba(255, 85, 85, 0.3)',
        x: [-5, 5, -5, 5, 0],
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.inOut',
        onComplete: () => {
          // Возвращаем стандартные стили
          gsap.to('.form-card', {
            backgroundColor: 'rgba(40, 42, 54, 0.7)',
            borderColor: 'rgba(68, 71, 90, 0.5)',
            opacity: 1,
            scale: 1,
            duration: 0.5,
          })
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Заголовок */}
      <div ref={headerRef} className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/suppliers')}
            className="mr-3 text-[#6272a4] hover:text-[#8be9fd] hover:bg-[#44475a]/30">
            <ArrowLeft className="h-4 w-4 mr-2" />К списку поставщиков
          </Button>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#bd93f9] to-[#ff79c6]">
            Создание нового поставщика
          </h1>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Основная информация */}
          <Card
            className="form-card md:col-span-2 border-[#44475a]/50 bg-[#282a36]/70 backdrop-blur-sm
                         transition-all duration-300 hover:shadow-lg hover:shadow-[#bd93f9]/5">
            <CardHeader className="border-b border-[#44475a]/30 pb-3">
              <div className="flex items-center">
                <Building className="w-5 h-5 mr-2 text-[#bd93f9]" />
                <CardTitle className="text-[#f8f8f2]">Основная информация</CardTitle>
              </div>
              <CardDescription className="text-[#6272a4]">Введите основные данные о поставщике</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#f8f8f2]">
                    Название компании <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="ООО Рога и Копыта"
                  />
                  {errors.name && <p className="text-sm text-[#ff5555]">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legalName" className="text-[#f8f8f2]">
                    Юридическое название <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="legalName"
                    {...register('legalName')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="Общество с ограниченной ответственностью 'Рога и Копыта'"
                  />
                  {errors.legalName && <p className="text-sm text-[#ff5555]">{errors.legalName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId" className="text-[#f8f8f2]">
                    ИНН <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="taxId"
                    {...register('taxId')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="7725123456"
                  />
                  {errors.taxId && <p className="text-sm text-[#ff5555]">{errors.taxId.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNumber" className="text-[#f8f8f2]">
                    ОГРН <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="registrationNumber"
                    {...register('registrationNumber')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="1027700132195"
                  />
                  {errors.registrationNumber && (
                    <p className="text-sm text-[#ff5555]">{errors.registrationNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-[#f8f8f2]">
                  Адрес <span className="text-[#ff5555]">*</span>
                </Label>
                <Input
                  id="address"
                  {...register('address')}
                  className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                  placeholder="ул. Примерная, д. 123, офис 45"
                />
                {errors.address && <p className="text-sm text-[#ff5555]">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-[#f8f8f2]">
                    Город <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="city"
                    {...register('city')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="Москва"
                  />
                  {errors.city && <p className="text-sm text-[#ff5555]">{errors.city.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-[#f8f8f2]">
                    Область/Регион
                  </Label>
                  <Input
                    id="state"
                    {...register('state')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="Московская область"
                  />
                  {errors.state && <p className="text-sm text-[#ff5555]">{errors.state.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-[#f8f8f2]">
                    Почтовый индекс <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    {...register('postalCode')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="123456"
                  />
                  {errors.postalCode && <p className="text-sm text-[#ff5555]">{errors.postalCode.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-[#f8f8f2]">
                  Страна <span className="text-[#ff5555]">*</span>
                </Label>
                <Input
                  id="country"
                  {...register('country')}
                  className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                  placeholder="Россия"
                />
                {errors.country && <p className="text-sm text-[#ff5555]">{errors.country.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Контактная информация и категории */}
          <Card
            className="form-card md:col-span-1 border-[#44475a]/50 bg-[#282a36]/70 backdrop-blur-sm
                         transition-all duration-300 hover:shadow-lg hover:shadow-[#ff79c6]/5">
            <CardHeader className="border-b border-[#44475a]/30 pb-3">
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-[#ff79c6]" />
                <CardTitle className="text-[#f8f8f2]">Контакты и категории</CardTitle>
              </div>
              <CardDescription className="text-[#6272a4]">Контактные данные и классификация</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#f8f8f2]">
                  Email <span className="text-[#ff5555]">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                  placeholder="info@example.ru"
                />
                {errors.email && <p className="text-sm text-[#ff5555]">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-[#f8f8f2]">
                  Телефон <span className="text-[#ff5555]">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  {...register('phoneNumber')}
                  className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                  placeholder="+7 (495) 123-45-67"
                />
                {errors.phoneNumber && <p className="text-sm text-[#ff5555]">{errors.phoneNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-[#f8f8f2]">
                  Веб-сайт
                </Label>
                <Input
                  id="website"
                  placeholder="https://example.ru"
                  {...register('website')}
                  className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                />
                {errors.website && <p className="text-sm text-[#ff5555]">{errors.website.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[#f8f8f2] flex items-center">
                  <Tag className="w-4 h-4 mr-1 text-[#8be9fd]" />
                  Категории <span className="text-[#ff5555]">*</span>
                </Label>
                {loadingCategories ? (
                  <div className="flex items-center justify-center p-4 bg-[#282a36] rounded-md border border-[#44475a]">
                    <Loader className="animate-spin h-4 w-4 mr-2 text-[#bd93f9]" />
                    <span className="text-[#6272a4]">Загрузка категорий...</span>
                  </div>
                ) : (
                  <div>
                    {categories.length === 0 ? (
                      <p className="text-sm text-[#6272a4]">Категории не найдены</p>
                    ) : (
                      <MultiSelect
                        options={categories.map(category => ({
                          label: category.name,
                          value: category.id,
                        }))}
                        selected={selectedCategories}
                        onChange={selected => {
                          setValue('categoryIds', selected, { shouldValidate: true })
                        }}
                        placeholder="Выберите категории..."
                        className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]"
                      />
                    )}
                  </div>
                )}
                {errors.categoryIds && <p className="text-sm text-[#ff5555]">{errors.categoryIds.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Контактное лицо и примечания */}
          <Card
            className="form-card md:col-span-3 border-[#44475a]/50 bg-[#282a36]/70 backdrop-blur-sm
                         transition-all duration-300 hover:shadow-lg hover:shadow-[#8be9fd]/5">
            <CardHeader className="border-b border-[#44475a]/30 pb-3">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2 text-[#8be9fd]" />
                <CardTitle className="text-[#f8f8f2]">Контактное лицо и примечания</CardTitle>
              </div>
              <CardDescription className="text-[#6272a4]">
                Данные о контактном лице и дополнительная информация
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPersonName" className="text-[#f8f8f2]">
                    ФИО контактного лица <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="contactPersonName"
                    {...register('contactPersonName')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="Иванов Иван Иванович"
                  />
                  {errors.contactPersonName && (
                    <p className="text-sm text-[#ff5555]">{errors.contactPersonName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPersonEmail" className="text-[#f8f8f2]">
                    Email контактного лица <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="contactPersonEmail"
                    type="email"
                    {...register('contactPersonEmail')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="ivan@example.ru"
                  />
                  {errors.contactPersonEmail && (
                    <p className="text-sm text-[#ff5555]">{errors.contactPersonEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPersonPhone" className="text-[#f8f8f2]">
                    Телефон контактного лица <span className="text-[#ff5555]">*</span>
                  </Label>
                  <Input
                    id="contactPersonPhone"
                    {...register('contactPersonPhone')}
                    className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                            placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                    placeholder="+7 (999) 123-45-67"
                  />
                  {errors.contactPersonPhone && (
                    <p className="text-sm text-[#ff5555]">{errors.contactPersonPhone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#f8f8f2] flex items-center">
                  <FileText className="w-4 h-4 mr-1 text-[#f1fa8c]" />
                  Примечания
                </Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  placeholder="Дополнительная информация о поставщике..."
                  className="bg-[#282a36] border-[#44475a] text-[#f8f8f2]
                          placeholder:text-[#6272a4] focus:border-[#bd93f9] focus:ring-[#bd93f9]"
                />
                {errors.notes && <p className="text-sm text-[#ff5555]">{errors.notes.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="border-t border-[#44475a]/30 p-4 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/suppliers')}
                className="border-[#44475a] bg-[#282a36] hover:bg-[#44475a] text-[#f8f8f2] hover:text-[#ff5555]">
                <X className="h-4 w-4 mr-2" />
                Отмена
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#bd93f9] to-[#ff79c6] hover:opacity-90 text-[#f8f8f2] border-none">
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Создать поставщика
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

      {/* Стили для анимаций */}
      <style jsx global>{`
        /* Анимация для полей формы при фокусе */
        input:focus,
        textarea:focus,
        select:focus {
          box-shadow: 0 0 0 2px rgba(189, 147, 249, 0.3);
          transition: all 0.2s ease;
        }

        /* Анимация для кнопок */
        button {
          transition: all 0.3s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        button:active:not(:disabled) {
          transform: translateY(1px);
        }

        /* Плавное появление ошибок */
        p.text-sm.text-\[\#ff5555\] {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </DashboardLayout>
  )
}
