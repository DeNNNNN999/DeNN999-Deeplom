'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { graphqlClient } from '@/lib/auth';
import { CREATE_USER_MUTATION } from '@/lib/graphql/mutations';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader, X, Check, Eye, EyeOff } from 'lucide-react';

// Схема валидации Zod для формы
const userFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters long' }).max(50, { message: 'First name must be less than 50 characters long' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters long' }).max(50, { message: 'Last name must be less than 50 characters long' }),
  role: z.enum(['ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_SPECIALIST'], {
    required_error: 'Please select a role',
  }),
  department: z.string().optional(),
});

// Тип для формы
type UserFormValues = z.infer<typeof userFormSchema>;

// Роли пользователей
const userRoles = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'PROCUREMENT_MANAGER', label: 'Procurement Manager' },
  { value: 'PROCUREMENT_SPECIALIST', label: 'Procurement Specialist' },
];

// Список отделов
const departments = [
  { value: 'IT', label: 'Information Technology' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'Human Resources' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
  { value: 'RnD', label: 'Research & Development' },
  { value: 'Legal', label: 'Legal' },
];

export default function CreateUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Инициализация react-hook-form с Zod валидацией
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      role: 'PROCUREMENT_SPECIALIST', // По умолчанию специалист по закупкам
    },
  });

  // Обработчик отправки формы
  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);

    try {
      const input = {
        ...data,
        department: data.department || null,
      };

      const response = await graphqlClient.request(CREATE_USER_MUTATION, {
        input,
      });

      toast.success('User created successfully');
      
      // Редирект на страницу созданного пользователя
      if (response.createUser?.id) {
        router.push(`/admin/users/${response.createUser.id}`);
      } else {
        router.push('/admin/users');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/users')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Create New User</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Основная информация о пользователе */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Enter the user's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="user@example.com" 
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Пароль */}
              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter secure password" 
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
                <div className="text-xs text-gray-500">
                  Password must contain at least 8 characters including uppercase, lowercase, number, and special character.
                </div>
              </div>

              {/* Имя */}
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="firstName" 
                  placeholder="Enter first name" 
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              {/* Фамилия */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="lastName" 
                  placeholder="Enter last name" 
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Доступ и отдел */}
          <Card>
            <CardHeader>
              <CardTitle>Access & Department</CardTitle>
              <CardDescription>Set user's role and department</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Роль пользователя */}
              <div className="space-y-2">
                <Label htmlFor="role">User Role <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  <p><strong>Administrator:</strong> Full system access with user management</p>
                  <p><strong>Procurement Manager:</strong> Can approve suppliers and contracts</p>
                  <p><strong>Procurement Specialist:</strong> Can create and edit suppliers and contracts</p>
                </div>
              </div>

              {/* Отдел */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.department && (
                  <p className="text-sm text-red-500">{errors.department.message}</p>
                )}
              </div>

              {/* Уведомление о настройках доступа */}
              <div className="mt-6 p-4 border rounded bg-blue-50 text-blue-700">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Access Information</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>User will receive an email with login credentials upon creation.</p>
                      <p className="mt-1">Default status is active. You can deactivate the user later if needed.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Кнопки действий */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/users')}
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
                Create User
              </>
            )}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
