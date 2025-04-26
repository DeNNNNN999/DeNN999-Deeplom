'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSuppliers } from '@/hooks/graphql/useSuppliers';
import { useSupplierCategories } from '@/hooks/graphql/useSupplierCategories';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SupplierInput } from '@/lib/graphql';

// Определяем схему валидации для формы создания поставщика
const supplierFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Наименование должно содержать минимум 2 символа',
  }),
  legalName: z.string().min(2, {
    message: 'Юридическое название должно содержать минимум 2 символа',
  }),
  taxId: z.string().min(5, {
    message: 'ИНН должен содержать минимум 5 символов',
  }),
  registrationNumber: z.string().min(3, {
    message: 'Регистрационный номер должен содержать минимум 3 символа',
  }),
  address: z.string().min(5, {
    message: 'Адрес должен содержать минимум 5 символов',
  }),
  city: z.string().min(2, {
    message: 'Город должен содержать минимум 2 символа',
  }),
  state: z.string().optional(),
  country: z.string().min(2, {
    message: 'Страна должна содержать минимум 2 символа',
  }),
  postalCode: z.string().min(3, {
    message: 'Почтовый индекс должен содержать минимум 3 символа',
  }),
  phoneNumber: z.string().min(7, {
    message: 'Номер телефона должен содержать минимум 7 символов',
  }),
  email: z.string().email({
    message: 'Введите корректный email адрес',
  }),
  website: z.string().url({
    message: 'Введите корректный URL сайта',
  }).optional().or(z.literal('')),
  notes: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonEmail: z.string().email({
    message: 'Введите корректный email контактного лица',
  }).optional().or(z.literal('')),
  contactPersonPhone: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, {
    message: 'Выберите хотя бы одну категорию',
  }),
  bankAccountInfo: z.object({
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    swiftCode: z.string().optional(),
    iban: z.string().optional(),
  }).optional(),
});

export default function CreateSupplierPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const { createSupplier, loading } = useSuppliers();
  const { supplierCategories, loading: categoriesLoading } = useSupplierCategories();
  
  const form = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      legalName: '',
      taxId: '',
      registrationNumber: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phoneNumber: '',
      email: '',
      website: '',
      notes: '',
      contactPersonName: '',
      contactPersonEmail: '',
      contactPersonPhone: '',
      categoryIds: [],
      bankAccountInfo: {
        accountNumber: '',
        bankName: '',
        swiftCode: '',
        iban: '',
      },
    },
  });

  const onSubmit = async (data: z.infer<typeof supplierFormSchema>) => {
    try {
      const supplierInput: SupplierInput = {
        ...data,
        bankAccountInfo: data.bankAccountInfo ? JSON.stringify(data.bankAccountInfo) : undefined,
      };

      const result = await createSupplier(supplierInput);
      
      if (result) {
        toast.success('Поставщик успешно создан');
        router.push('/specialist/suppliers');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Ошибка при создании поставщика');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Создание нового поставщика</h1>
          <p className="text-gray-500">Заполните информацию о новом поставщике</p>
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
          <CardTitle>Информация о поставщике</CardTitle>
          <CardDescription>
            Заполните необходимую информацию для создания нового поставщика
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="general">Основная информация</TabsTrigger>
                  <TabsTrigger value="contact">Контактная информация</TabsTrigger>
                  <TabsTrigger value="categories">Категории</TabsTrigger>
                  <TabsTrigger value="banking">Банковские реквизиты</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Наименование</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите наименование" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="legalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Юридическое название</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите юридическое название" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ИНН</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите ИНН" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Регистрационный номер</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите рег. номер" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Адрес</FormLabel>
                        <FormControl>
                          <Input placeholder="Введите адрес" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Город</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите город" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Область/Штат</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите область/штат" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Почтовый индекс</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите почтовый индекс" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Страна</FormLabel>
                        <FormControl>
                          <Input placeholder="Введите страну" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Примечания</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Введите дополнительную информацию о поставщике" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите номер телефона" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Веб-сайт</FormLabel>
                        <FormControl>
                          <Input placeholder="Введите URL веб-сайта" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-2">Контактное лицо</h3>
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="contactPersonName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ФИО контактного лица</FormLabel>
                            <FormControl>
                              <Input placeholder="Введите ФИО" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactPersonEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email контактного лица</FormLabel>
                            <FormControl>
                              <Input placeholder="Введите email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="contactPersonPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон контактного лица</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите номер телефона" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="categories" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="categoryIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Категории поставщика</FormLabel>
                        <FormDescription>
                          Выберите одну или несколько категорий, к которым относится поставщик
                        </FormDescription>
                        <div className="space-y-2 mt-2">
                          {categoriesLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            supplierCategories?.map((category) => (
                              <div className="flex items-center space-x-2" key={category.id}>
                                <Checkbox
                                  id={`category-${category.id}`}
                                  checked={field.value?.includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedCategories = checked
                                      ? [...field.value, category.id]
                                      : field.value?.filter((value) => value !== category.id);
                                    field.onChange(updatedCategories);
                                  }}
                                />
                                <label
                                  htmlFor={`category-${category.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {category.name}
                                  {category.description && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      - {category.description}
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="banking" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="bankAccountInfo.bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Наименование банка</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите наименование банка" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bankAccountInfo.accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Номер счета</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите номер счета" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="bankAccountInfo.swiftCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT код</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите SWIFT код" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bankAccountInfo.iban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите IBAN" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                  Создать поставщика
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
