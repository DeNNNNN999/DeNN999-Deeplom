'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelect } from '@/components/ui/multi-select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { graphqlClient } from '@/lib/auth';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader, X } from 'lucide-react';

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
`;

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
`;

// Тип для категорий поставщиков
type SupplierCategory = {
  id: string;
  name: string;
};

// Схема валидации Zod для формы
const supplierFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }).max(100, { message: 'Name must be less than 100 characters long' }),
  legalName: z.string().min(2, { message: 'Legal name must be at least 2 characters long' }).max(100, { message: 'Legal name must be less than 100 characters long' }),
  taxId: z.string().min(5, { message: 'Tax ID must be at least 5 characters long' }).max(50, { message: 'Tax ID must be less than 50 characters long' }),
  registrationNumber: z.string().min(5, { message: 'Registration number must be at least 5 characters long' }).max(50, { message: 'Registration number must be less than 50 characters long' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters long' }).max(200, { message: 'Address must be less than 200 characters long' }),
  city: z.string().min(2, { message: 'City must be at least 2 characters long' }).max(100, { message: 'City must be less than 100 characters long' }),
  state: z.string().optional(),
  country: z.string().min(2, { message: 'Country must be at least 2 characters long' }).max(100, { message: 'Country must be less than 100 characters long' }),
  postalCode: z.string().min(2, { message: 'Postal code must be at least 2 characters long' }).max(20, { message: 'Postal code must be less than 20 characters long' }),
  phoneNumber: z.string().min(5, { message: 'Phone number must be at least 5 characters long' }).max(20, { message: 'Phone number must be less than 20 characters long' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  website: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  notes: z.string().max(1000, { message: 'Notes must be less than 1000 characters long' }).optional(),
  contactPersonName: z.string().min(2, { message: 'Contact person name must be at least 2 characters long' }).max(100, { message: 'Contact person name must be less than 100 characters long' }),
  contactPersonEmail: z.string().email({ message: 'Please enter a valid email address' }),
  contactPersonPhone: z.string().min(5, { message: 'Contact person phone must be at least 5 characters long' }).max(20, { message: 'Contact person phone must be less than 20 characters long' }),
  categoryIds: z.array(z.string()).min(1, { message: 'Please select at least one category' }),
});

// Тип для формы
type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function CreateSupplierPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
      categoryIds: [],
    },
  });

  // Наблюдение за выбранными категориями
  const selectedCategories = watch('categoryIds');

  // Загрузка категорий поставщиков
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await graphqlClient.request(GET_SUPPLIER_CATEGORIES, {
          pagination: { page: 1, limit: 100 }, // Получаем до 100 категорий
        });
        
        if (response.supplierCategories?.items) {
          setCategories(response.supplierCategories.items);
        }
      } catch (error) {
        console.error('Error fetching supplier categories:', error);
        toast.error('Failed to load supplier categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Обработчик успешной отправки формы
  const onSubmit = async (data: SupplierFormValues) => {
    setIsSubmitting(true);

    try {
      // Преобразование данных формы в формат для GraphQL мутации
      const input = {
        ...data,
        website: data.website || null,
        notes: data.notes || null,
        state: data.state || null,
      };

      const response = await graphqlClient.request(CREATE_SUPPLIER, {
        input,
      });

      toast.success('Supplier created successfully');
      
      // Редирект на страницу поставщика после создания
      if (response.createSupplier?.id) {
        router.push(`/admin/suppliers/${response.createSupplier.id}`);
      } else {
        router.push('/admin/suppliers');
      }
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to create supplier';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик выбора категорий
  const handleCategoryChange = (categoryId: string) => {
    const currentCategories = selectedCategories || [];
    const categoryIndex = currentCategories.indexOf(categoryId);
    
    if (categoryIndex === -1) {
      // Добавление категории
      setValue('categoryIds', [...currentCategories, categoryId], { shouldValidate: true });
    } else {
      // Удаление категории
      setValue(
        'categoryIds',
        currentCategories.filter((id) => id !== categoryId),
        { shouldValidate: true }
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/suppliers')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Create New Supplier</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Основная информация */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the supplier's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name <span className="text-red-500">*</span></Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal Name <span className="text-red-500">*</span></Label>
                  <Input id="legalName" {...register('legalName')} />
                  {errors.legalName && <p className="text-sm text-red-500">{errors.legalName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID <span className="text-red-500">*</span></Label>
                  <Input id="taxId" {...register('taxId')} />
                  {errors.taxId && <p className="text-sm text-red-500">{errors.taxId.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number <span className="text-red-500">*</span></Label>
                  <Input id="registrationNumber" {...register('registrationNumber')} />
                  {errors.registrationNumber && <p className="text-sm text-red-500">{errors.registrationNumber.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                <Input id="address" {...register('address')} />
                {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input id="city" {...register('city')} />
                  {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input id="state" {...register('state')} />
                  {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code <span className="text-red-500">*</span></Label>
                  <Input id="postalCode" {...register('postalCode')} />
                  {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                <Input id="country" {...register('country')} />
                {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Контактная информация и категории */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Contact & Categories</CardTitle>
              <CardDescription>Communication details and classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number <span className="text-red-500">*</span></Label>
                <Input id="phoneNumber" {...register('phoneNumber')} />
                {errors.phoneNumber && <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://..." {...register('website')} />
                {errors.website && <p className="text-sm text-red-500">{errors.website.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Categories <span className="text-red-500">*</span></Label>
                {loadingCategories ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    <span>Loading categories...</span>
                  </div>
                ) : (
                  <div>
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500">No categories available</p>
                    ) : (
                      <MultiSelect
                        options={categories.map(category => ({
                          label: category.name,
                          value: category.id,
                        }))}
                        selected={selectedCategories || []}
                        onChange={(selected) => {
                          setValue('categoryIds', selected, { shouldValidate: true });
                        }}
                        placeholder="Select categories..."
                      />
                    )}
                  </div>
                )}
                {errors.categoryIds && <p className="text-sm text-red-500">{errors.categoryIds.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Контактное лицо и примечания */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Contact Person & Notes</CardTitle>
              <CardDescription>Who to contact and additional information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPersonName">Contact Person Name <span className="text-red-500">*</span></Label>
                  <Input id="contactPersonName" {...register('contactPersonName')} />
                  {errors.contactPersonName && <p className="text-sm text-red-500">{errors.contactPersonName.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPersonEmail">Contact Person Email <span className="text-red-500">*</span></Label>
                  <Input id="contactPersonEmail" type="email" {...register('contactPersonEmail')} />
                  {errors.contactPersonEmail && <p className="text-sm text-red-500">{errors.contactPersonEmail.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPersonPhone">Contact Person Phone <span className="text-red-500">*</span></Label>
                  <Input id="contactPersonPhone" {...register('contactPersonPhone')} />
                  {errors.contactPersonPhone && <p className="text-sm text-red-500">{errors.contactPersonPhone.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  placeholder="Additional information about this supplier..."
                />
                {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/suppliers')}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button 
                type="submit"
                disabled={isSubmitting}
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
                    Create Supplier
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  );
}
