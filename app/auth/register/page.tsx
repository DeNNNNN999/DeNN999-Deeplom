'use client';

import '../styles.css';
import '../styles/gradients.css';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GraphQLClient, gql } from 'graphql-request';
import Cookies from 'js-cookie';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import gsap from 'gsap';

// Кастомные компоненты
import GradientWaveBackground from '../components/GradientWaveBackground';
import ReactLogo from '../components/ReactLogo';

// Компоненты UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Схема валидации Zod
const registerSchema = z.object({
  name: z.string().min(2, 'Название компании должно содержать минимум 2 символа'),
  legalName: z.string().min(2, 'Юридическое наименование должно содержать минимум 2 символа'),
  taxId: z.string().min(10, 'ИНН должен содержать не менее 10 символов'),
  registrationNumber: z.string().min(13, 'ОГРН должен содержать не менее 13 символов'),
  address: z.string().min(5, 'Адрес должен содержать минимум 5 символов'),
  city: z.string().min(2, 'Название города должно содержать минимум 2 символа'),
  state: z.string().optional(),
  country: z.string().min(2, 'Название страны должно содержать минимум 2 символа'),
  postalCode: z.string().min(5, 'Почтовый индекс должен содержать минимум 5 символов'),
  phoneNumber: z.string().min(10, 'Телефон должен содержать минимум 10 цифр'),
  email: z.string().email('Пожалуйста, введите корректный email'),
  website: z.string().optional(),
  contactPersonName: z.string().min(2, 'Имя контактного лица должно содержать минимум 2 символа'),
  contactPersonEmail: z.string().email('Пожалуйста, введите корректный email контактного лица'),
  contactPersonPhone: z.string().min(10, 'Телефон контактного лица должен содержать минимум 10 цифр'),
  description: z.string().optional(),
  password: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, {
    message: 'Вы должны принять условия использования'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// GraphQL
const graphqlEndpoint = process.env.NEXT_PUBLIC_API_URL || '/graphql';
const graphqlClient = new GraphQLClient(graphqlEndpoint);
const REGISTER_MUTATION = gql`
  mutation RegisterSupplier($input: SupplierRegistrationInput!) {
    registerSupplier(input: $input) {
      success
      message
      supplier {
        id
        name
        email
      }
    }
  }
`;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const formElements = useRef<(HTMLDivElement | null)[]>([]);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Инициализация GSAP анимаций
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      timelineRef.current = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Анимация карточки
      timelineRef.current
        .fromTo(cardRef.current, 
          { y: 50, opacity: 0, scale: 0.9 }, 
          { y: 0, opacity: 1, scale: 1, duration: 0.8 }
        )
        .from(formElements.current, { 
          y: 30, 
          opacity: 0, 
          stagger: 0.08,
          duration: 0.5
        }, "-=0.4");
    }, mainRef);

    return () => ctx.revert(); // Очистка анимации при размонтировании
  }, []);

  // Эффект свечения за курсором
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      
      const rect = mainRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePosition({ x, y });
      
      // Убран эффект наклона карточки
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Анимация при наведении на кнопку
  const handleButtonHover = (isHover: boolean) => {
    const button = document.querySelector('.register-button');
    if (!button) return;
    
    gsap.to(button, {
      scale: isHover ? 1.03 : 1,
      boxShadow: isHover ? '0 10px 25px -5px rgba(0, 188, 212, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      duration: 0.3,
      ease: "power2.out"
    });
  };

  // Обработчик для анимации сложности пароля
  const handlePasswordChange = (value: string) => {
    const strength = calculatePasswordStrength(value);
    setPasswordStrength(strength);
    
    const strengthBar = document.querySelector('.password-strength-bar');
    if (!strengthBar) return;
    
    let width = `${strength * 25}%`;
    let color;
    
    if (strength === 0) color = '#ef4444'; // red-500
    else if (strength === 1) color = '#ef4444'; // red-500
    else if (strength === 2) color = '#eab308'; // yellow-500
    else if (strength === 3) color = '#3b82f6'; // blue-500
    else color = '#00BCD4'; // teal

    gsap.to(strengthBar, {
      width,
      backgroundColor: color,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  // Функция для расчета сложности пароля (0-4)
  const calculatePasswordStrength = (password: string) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      legalName: '',
      taxId: '',
      registrationNumber: '',
      address: '',
      city: '',
      state: '',
      country: 'Россия',
      postalCode: '',
      phoneNumber: '',
      email: '',
      website: '',
      description: '',
      contactPersonName: '',
      contactPersonEmail: '',
      contactPersonPhone: '',
      password: '',
      confirmPassword: '',
      terms: false
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    const toastId = toast.loading('Создание аккаунта...');
    
    try {
      // Формируем данные для запроса в соответствии с SupplierRegistrationInput
      const { confirmPassword, terms, password, ...supplierData } = data;
      
      // categoryIds обязательный в схеме GraphQL, но в резолвере он извлекается и может быть пустым
      const variables = { 
        input: {
          ...supplierData,
          categoryIds: [] // Пустой массив по умолчанию, в будущем можно добавить выбор категорий
        } 
      };
      
      const response = await graphqlClient.request<{ 
        registerSupplier: { 
          success: boolean;
          message: string;
          supplier: { id: string; name: string; email: string } | null;
        } 
      }>(REGISTER_MUTATION, variables);
      
      const { success, message, supplier } = response.registerSupplier;
      
      if (success && supplier) {
        // Анимация успешной регистрации
        timelineRef.current = gsap.timeline({ 
          onComplete: () => {
            toast.success(message || `Регистрация успешна! Ваша заявка будет рассмотрена администрацией.`, { id: toastId });
            
            setTimeout(() => {
              router.push('/auth/login');
            }, 500);
          }
        });

        timelineRef.current
          .to(cardRef.current, { 
            y: -20, 
            opacity: 0, 
            scale: 0.95, 
            duration: 0.5,
            ease: "power3.in" 
          });
          
      } else {
        throw new Error(message || 'Неизвестная ошибка при регистрации');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.errors?.[0]?.message 
        || error.message 
        || 'Ошибка регистрации. Пожалуйста, попробуйте позже.';
      
      // Анимация ошибки
      gsap.timeline()
        .to(cardRef.current, { 
          x: 10, 
          duration: 0.1, 
          ease: "power1.inOut", 
          repeat: 5, 
          yoyo: true 
        })
        .to(cardRef.current, { x: 0 });
      
      toast.error(errorMessage, { id: toastId });
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={mainRef} 
      className="flex min-h-screen items-center justify-center p-4 overflow-hidden relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 space-wave-bg"
    >
      {/* Анимированный фон с градиентными волнами */}
      <GradientWaveBackground />

      {/* Эффект свечения за курсором */}
      <div 
        className="absolute pointer-events-none bg-teal-500 opacity-10 blur-[100px] rounded-full w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] transition-transform duration-500 ease-out"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Основная карточка */}
      <div 
        ref={cardRef} 
        className="w-full max-w-3xl relative z-10"
      >
        <Card className="backdrop-blur-2xl shadow-[0_0_50px_rgba(0,188,212,0.2)] bg-slate-900/70 border-0 overflow-hidden card-gradient-border">
          <div className="card-blur-bg"></div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-teal-500 via-slate-700 to-indigo-800" />
            <div className="absolute -inset-[100px] bg-gradient-to-br from-teal-500/10 via-transparent to-indigo-600/10 backdrop-blur-3xl rounded-full opacity-30 blur-3xl" />
          </div>

          <CardHeader className="space-y-3 text-center p-6 relative z-10">
            <div 
              className="flex justify-center"
              ref={el => formElements.current[0] = el}
            >
              <div className="relative flex justify-center items-center h-20 w-20">
                <ReactLogo className="neon-glow" size={80} />
              </div>
            </div>
            <div ref={el => formElements.current[1] = el}>
              <CardTitle className="text-3xl font-bold shimmer-text" style={{ color: '#00BCD4' }}>
                Регистрация поставщика
              </CardTitle>
            </div>
            <div ref={el => formElements.current[2] = el}>
              <CardDescription className="text-slate-300 pt-1 text-lg">
                Создайте аккаунт для доступа к системе
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8 relative z-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-slate-800/30 p-4 rounded-md mb-6">
                  <h3 className="text-lg font-semibold text-teal-400 mb-4">Данные компании</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref={el => formElements.current[3] = el}>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Название компании</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:building-office-2" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="ООО 'Название компании'" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[4] = el}>
                      <FormField
                        control={form.control}
                        name="legalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Юридическое наименование</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:document-text" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Общество с ограниченной ответственностью 'Название компании'" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div ref={el => formElements.current[5] = el}>
                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">ИНН</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:identification" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="7707083893" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[6] = el}>
                      <FormField
                        control={form.control}
                        name="registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">ОГРН</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:document-check" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="1027700132195" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div ref={el => formElements.current[7] = el} className="mt-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-[15px]">Адрес</FormLabel>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <div className="relative">
                              <Icon 
                                icon="heroicons:map-pin" 
                                className="absolute left-3 top-[14px] text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                width={20} 
                                height={20} 
                              />
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="ул. Ленина, д. 1, офис 123" 
                                  className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    <div ref={el => formElements.current[8] = el}>
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Город</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:building-office" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Москва" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[9] = el}>
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Область/Регион</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:map" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Московская область" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[10] = el}>
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Почтовый индекс</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:envelope" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="123456" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div ref={el => formElements.current[11] = el}>
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Страна</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:globe-alt" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Россия" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[12] = el}>
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Телефон</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:phone" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="+7 (999) 123-45-67" 
                                    type="tel" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[13] = el}>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Email компании</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:at-symbol" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="company@example.com" 
                                    type="email" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div ref={el => formElements.current[14] = el} className="mt-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-[15px]">Веб-сайт</FormLabel>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <div className="relative">
                              <Icon 
                                icon="heroicons:globe-alt" 
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                width={20} 
                                height={20} 
                              />
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="https://www.example.com" 
                                  className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div ref={el => formElements.current[15] = el} className="mt-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-[15px]">Описание компании</FormLabel>
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <div className="relative">
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Краткое описание вашей компании, сфера деятельности, специализация..." 
                                  className="min-h-[100px] bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-slate-800/30 p-4 rounded-md mb-6">
                  <h3 className="text-lg font-semibold text-teal-400 mb-4">Контактное лицо</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div ref={el => formElements.current[16] = el}>
                      <FormField
                        control={form.control}
                        name="contactPersonName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">ФИО</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:user" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Иванов Иван Иванович" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[17] = el}>
                      <FormField
                        control={form.control}
                        name="contactPersonEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Email</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:envelope" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="contact@example.com" 
                                    type="email" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[18] = el}>
                      <FormField
                        control={form.control}
                        name="contactPersonPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Телефон</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:phone" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="+7 (999) 123-45-67" 
                                    type="tel" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 p-4 rounded-md">
                  <h3 className="text-lg font-semibold text-teal-400 mb-4">Данные для входа</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref={el => formElements.current[19] = el}>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Пароль</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:lock-closed" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="password" 
                                    placeholder="••••••••" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handlePasswordChange(e.target.value);
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <div className="h-1 mt-1 bg-slate-800 rounded overflow-hidden">
                                <div className="password-strength-bar h-full rounded" style={{ width: '0%' }}></div>
                              </div>
                              <div className="flex justify-between text-xs mt-1 text-slate-400">
                                <span>Слабый</span>
                                <span>Средний</span>
                                <span>Сильный</span>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div ref={el => formElements.current[20] = el}>
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Подтверждение пароля</FormLabel>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-600 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                              <div className="relative">
                                <Icon 
                                  icon="heroicons:lock-closed" 
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-400 transition-colors duration-200" 
                                  width={20} 
                                  height={20} 
                                />
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="password" 
                                    placeholder="••••••••" 
                                    className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div ref={el => formElements.current[21] = el} className="pt-2">
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 border-slate-600 rounded"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal text-slate-300">
                            Я принимаю <a href="#" className="text-teal-400 hover:text-teal-300">условия использования</a> и <a href="#" className="text-teal-400 hover:text-teal-300">политику конфиденциальности</a>
                          </FormLabel>
                          <FormMessage className="text-red-400" />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div 
                  ref={el => formElements.current[22] = el} 
                  className="pt-4"
                >
                  <button
                    type="submit"
                    className="register-button w-full h-12 relative text-[15px] font-medium rounded-md text-white shadow-lg transition-all duration-300 overflow-hidden disabled:opacity-60 disabled:pointer-events-none neon-glow"
                    style={{ background: 'linear-gradient(90deg, #121212 0%, #311B92 50%, #00BCD4 100%)' }}
                    onMouseEnter={() => handleButtonHover(true)}
                    onMouseLeave={() => handleButtonHover(false)}
                    disabled={isLoading}
                  >
                    <div className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <Icon icon="line-md:loading-twotone-loop" className="mr-2 h-5 w-5" /> 
                          Регистрация...
                        </>
                      ) : (
                        <>
                          <Icon icon="heroicons:user-plus" className="mr-2 h-5 w-5" /> 
                          Зарегистрироваться
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </Form>
          </CardContent>

          <CardFooter 
            ref={el => formElements.current[23] = el}
            className="flex flex-col items-center p-4 pt-0 border-t border-slate-800/50 mt-6 relative z-10"
          >
            <div className="text-sm text-slate-300">
              Уже есть аккаунт?{' '}
              <Link href="/auth/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200">
                Войти
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
