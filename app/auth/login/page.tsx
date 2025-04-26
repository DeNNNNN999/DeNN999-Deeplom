'use client';

import '../styles.css';
import '../styles/gradients.css';
import '../styles/button-effects.css';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GraphQLClient, gql } from 'graphql-request';
import Cookies from 'js-cookie';
import { Icon } from '@iconify/react';
import Link from 'next/link';

// Кастомные компоненты
import GradientWaveBackground from '../components/GradientWaveBackground';
import ReactLogo from '../components/ReactLogo';

// Компоненты UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

// Схема валидации Zod
const loginSchema = z.object({
  email: z.string().email('Пожалуйста, введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  remember: z.boolean().optional().default(false)
});

type LoginFormValues = z.infer<typeof loginSchema>;

// GraphQL
const graphqlEndpoint = process.env.NEXT_PUBLIC_API_URL || '/graphql';
const graphqlClient = new GraphQLClient(graphqlEndpoint);
const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) { 
      token 
      user { 
        id 
        email 
        firstName 
        lastName 
        role 
      } 
    }
  }
`;

type LoggedInUser = { 
  id: string; 
  email: string; 
  firstName?: string; 
  lastName?: string; 
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'; 
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const formElements = useRef<(HTMLDivElement | null)[]>([]);

  // Инициализация анимаций при загрузке без GSAP
  useEffect(() => {
    // Получаем все элементы формы
    const formElementsArray = formElements.current.filter(el => el);
    
    // Изначально скрываем все элементы
    formElementsArray.forEach(el => {
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
      }
    });
    
    // Скрываем карточку
    if (cardRef.current) {
      cardRef.current.style.opacity = '0';
      cardRef.current.style.transform = 'translateY(50px) scale(0.9)';
    }
    
    // Анимируем появление карточки
    setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'translateY(0) scale(1)';
        cardRef.current.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      }
      
      // Анимируем появление элементов формы поочередно
      formElementsArray.forEach((el, index) => {
        setTimeout(() => {
          if (el) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          }
        }, 400 + index * 100); // С задержкой для поочередного появления
      });
    }, 100);
  }, []);

  // Эффект свечения за курсором
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      
      const rect = mainRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePosition({ x, y });
      
      // Наклон карточки в сторону курсора - упрощенная версия без gsap
      if (cardRef.current) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const cardX = cardRect.left + cardRect.width / 2;
        const cardY = cardRect.top + cardRect.height / 2;
        
        // Вычисляем угол наклона относительно центра карточки
        const deltaX = (e.clientX - cardX) / 30;
        const deltaY = (e.clientY - cardY) / 30;
        
        // Применяем CSS трансформацию напрямую
        cardRef.current.style.transform = `perspective(1000px) rotateY(${deltaX}deg) rotateX(${-deltaY}deg)`;
        cardRef.current.style.transition = '0.1s transform ease-out';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Обработка наведения на кнопку - упрощенная версия без gsap
  const handleButtonHover = (isHover: boolean) => {
    const button = document.querySelector('.login-button');
    if (!button) return;
    
    if (isHover) {
      button.classList.add('button-hover-effect');
    } else {
      button.classList.remove('button-hover-effect');
    }
  };

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const toastId = toast.loading('Выполняется вход...');
    
    try {
      const variables = { 
        input: { 
          email: data.email, 
          password: data.password 
        } 
      };
      
      const response = await graphqlClient.request<{ login: { token: string; user: LoggedInUser } }>(LOGIN_MUTATION, variables);
      
      if (response.login?.token && response.login?.user) {
        const { token, user } = response.login;
        Cookies.set('auth_token', token, { 
          expires: data.remember ? 30 : 7, 
          path: '/', 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'lax' 
        });
        localStorage.setItem('user', JSON.stringify(user));
        
        // Анимация успешного входа - упрощенная без timeline
        if (cardRef.current) {
          // Используем простой CSS переход
          cardRef.current.style.opacity = '0';
          cardRef.current.style.transform = 'translateY(-20px) scale(0.95)';
          cardRef.current.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        }
        
        toast.success(`Добро пожаловать, ${user.firstName || user.email}!`, { id: toastId });
        
        // Перенаправляем на соответствующую страницу
        setTimeout(() => {
          if (user.role === 'ADMIN') router.push('/admin/dashboard');
          else if (user.role === 'PROCUREMENT_MANAGER') router.push('/manager/dashboard');
          else router.push('/specialist/dashboard');
        }, 1000);
          
      } else {
        throw new Error('Некорректный ответ от сервера');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.errors?.[0]?.message 
        || error.message 
        || 'Ошибка входа. Проверьте email и пароль.';
      
      // Анимация ошибки без GSAP
      if (cardRef.current) {
        let count = 0;
        const shake = () => {
          count++;
          if (count > 10) return; // Останавливаем после 5 колебаний (туда-обратно)
          
          const xOffset = count % 2 === 0 ? 0 : (count % 4 === 1 ? 10 : -10);
          cardRef.current!.style.transform = `translateX(${xOffset}px)`;
          cardRef.current!.style.transition = 'transform 0.1s ease-in-out';
          
          setTimeout(shake, 100);
        };
        shake();
      }
      
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

            {/* Необходимо использовать безопасные трансформации */}
            <div 
              className="ml-3 p-1.5 rounded-full transition duration-300 ease-out bg-indigo-500/10"  
              style={{
                position: 'absolute',
                left: mousePosition.x,
                top: mousePosition.y,
                width: '30vw',
                height: '30vw',
                maxWidth: '400px',
                maxHeight: '400px',
                opacity: 0.1,
                filter: 'blur(100px)',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />

      {/* Основная карточка */}
      <div 
        ref={cardRef} 
        className="w-full max-w-md relative z-10 perspective-1000"
      >
        <Card className="backdrop-blur-2xl shadow-[0_0_50px_rgba(0,188,212,0.2)] bg-slate-900/70 border-0 overflow-hidden card-gradient-border">
          <div className="card-blur-bg"></div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500" />
            <div className="absolute -inset-[100px] bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 backdrop-blur-3xl rounded-full opacity-30 blur-3xl" />
          </div>

          <CardHeader className="space-y-3 text-center p-6 relative z-10">
            <div 
              className="flex justify-center"
              ref={el => formElements.current[0] = el}
            >
              <div className="relative flex justify-center items-center h-24 w-24">
                <ReactLogo className="neon-glow expand-on-hover" size={100} />
              </div>
            </div>
            <div ref={el => formElements.current[1] = el}>
              <CardTitle className="text-3xl font-bold shimmer-text" style={{ color: '#00BCD4' }}>
                Supplier Management
              </CardTitle>
            </div>
            <div ref={el => formElements.current[2] = el}>
              <CardDescription className="text-slate-300 pt-1 text-lg">
                Войдите в свой аккаунт
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8 relative z-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div ref={el => formElements.current[3] = el}>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300 text-[15px]">Email</FormLabel>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                          <div className="relative">
                            <Icon 
                              icon="heroicons:envelope" 
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-400 transition-colors duration-200" 
                              width={20} 
                              height={20} 
                            />
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="your.email@company.com" 
                                type="email" 
                                className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300 text-[15px]">Пароль</FormLabel>
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-md blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                          <div className="relative">
                            <Icon 
                              icon="heroicons:lock-closed" 
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-400 transition-colors duration-200" 
                              width={20} 
                              height={20} 
                            />
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="••••••••" 
                                className="pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-slate-500 transition-all duration-200 input-glow shiny-border"
                              />
                            </FormControl>
                          </div>
                        </div>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <div 
                  ref={el => formElements.current[5] = el}
                  className="flex items-center justify-between mt-2"
                >
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 border-slate-600 rounded"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal text-slate-300">
                          Запомнить меня
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm text-indigo-400 hover:text-indigo-300 no-underline hover:underline transition-colors duration-200"
                  >
                    Забыли пароль?
                  </Link>
                </div>

                <div 
                  ref={el => formElements.current[6] = el} 
                  className="pt-2"
                >
                  <button
                    type="submit"
                    className="login-button w-full h-12 relative text-[15px] font-medium rounded-md text-white shadow-lg transition-all duration-300 overflow-hidden disabled:opacity-60 disabled:pointer-events-none neon-glow"
                    style={{ background: 'linear-gradient(90deg, #121212 0%, #311B92 50%, #00BCD4 100%)' }}
                    onMouseEnter={() => handleButtonHover(true)}
                    onMouseLeave={() => handleButtonHover(false)}
                    disabled={isLoading}
                  >
                    <div className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <Icon icon="line-md:loading-twotone-loop" className="mr-2 h-5 w-5" /> 
                          Вход...
                        </>
                      ) : (
                        <>
                          <Icon icon="heroicons:arrow-right-on-rectangle" className="mr-2 h-5 w-5" /> 
                          Войти
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </Form>
          </CardContent>

          <CardFooter 
            ref={el => formElements.current[7] = el}
            className="flex flex-col items-center p-4 pt-0 border-t border-slate-800/50 mt-6 relative z-10"
          >
            <div className="text-sm text-slate-300">
              Нет аккаунта?{' '}
              <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200">
                Зарегистрироваться
              </Link>
            </div>
            <div className="text-sm mt-3 p-3 bg-slate-800/70 rounded-md border border-indigo-500/30">
              <p className="font-medium text-indigo-400 mb-1">Демо-доступ:</p>
              <p className="text-slate-300">Email: <span className="text-white font-mono">admin@example.com</span></p>
              <p className="text-slate-300">Пароль: <span className="text-white font-mono">admin123</span></p>
              <p className="text-xs text-slate-400 mt-2">*Перед первым входом запустите <span className="text-white font-mono">npm run seed:admin</span></p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
