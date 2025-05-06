'use client'

import '../styles.css'
import '../styles/gradients.css'
import '../styles/button-effects.css'
import '../styles/flip-card.css'

import React, { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GraphQLClient, gql } from 'graphql-request'
import Cookies from 'js-cookie'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Динамический импорт компонентов, которые зависят от window
const SupplierStaticLogo = dynamic(() => import('../components/SupplierStaticLogo'), { ssr: false })
const BacksideLogin = dynamic(() => import('../components/BacksideLogin'), { ssr: false })

// Компоненты UI
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

// GSAP для анимаций
import { gsap } from 'gsap'

// Anime.js для дополнительных анимаций
let anime
if (typeof window !== 'undefined') {
  anime = require('animejs').default
}

// Схема валидации Zod
const loginSchema = z.object({
  email: z.string().email('Пожалуйста, введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  remember: z.boolean().optional().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

// GraphQL
const graphqlEndpoint = process.env.NEXT_PUBLIC_API_URL || '/graphql'
const graphqlClient = new GraphQLClient(graphqlEndpoint)
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
`

type LoggedInUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_SPECIALIST'
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const formContainerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const bgParticlesRef = useRef<HTMLDivElement>(null)
  const loginBgRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<HTMLDivElement[]>([])
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [loginError, setLoginError] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const emailIconRef = useRef<HTMLDivElement>(null)
  const passwordIconRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Инициализация формы при загрузке
  useEffect(() => {
    if (typeof window === 'undefined' || !formContainerRef.current) return

    // Анимация появления формы
    gsap.fromTo(
      formContainerRef.current,
      {
        y: 50,
        opacity: 0,
        scale: 0.95,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'expo.out',
      },
    )

    // Анимация заголовка
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        {
          clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
          opacity: 0,
        },
        {
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          opacity: 1,
          duration: 1.5,
          delay: 0.5,
          ease: 'power4.out',
        },
      )
    }

    // Анимация полей формы
    if (formRef.current) {
      const formFields = formRef.current.querySelectorAll('.form-field-container')
      gsap.fromTo(
        formFields,
        {
          y: 20,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          delay: 0.6,
          duration: 0.8,
          ease: 'back.out(1.7)',
        },
      )
    }
  }, [])

  // Анимация фона при загрузке
  useEffect(() => {
    if (typeof window === 'undefined' || !loginBgRef.current) return

    // Создаем эффект плавающего градиента
    gsap.to(loginBgRef.current, {
      backgroundPosition: `${Math.random() * 100}% ${Math.random() * 100}%`,
      duration: 15,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  }, [])

  // Эффект создания и анимации фоновых элементов
  useEffect(() => {
    if (typeof window === 'undefined' || !bgParticlesRef.current) return

    // Очищаем существующие частицы
    while (bgParticlesRef.current.firstChild) {
      bgParticlesRef.current.removeChild(bgParticlesRef.current.firstChild)
    }

    // Создаем новые частицы разных типов
    const particleCount = 30
    const newParticles: HTMLDivElement[] = []

    const createParticles = () => {
      // Создаем разные типы частиц для визуального разнообразия
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div')
        particle.classList.add('bg-particle')

        // Определяем тип частицы: круг, квадрат, треугольник или звезда
        const particleType = Math.floor(Math.random() * 4)

        // Размер и внешний вид
        const size = 10 + Math.random() * 30
        particle.style.width = `${size}px`
        particle.style.height = `${size}px`

        // Позиция
        particle.style.left = `${Math.random() * 100}%`
        particle.style.top = `${Math.random() * 100}%`
        particle.style.zIndex = '-1'

        // Применяем стили в зависимости от типа частицы
        switch (particleType) {
          case 0: // Круг с градиентом
            particle.style.borderRadius = '50%'
            const hue1 = 200 + Math.random() * 60
            const opacity1 = 0.1 + Math.random() * 0.2
            particle.style.background = `radial-gradient(circle at center,
              hsla(${hue1}, 90%, 70%, ${opacity1}),
              hsla(${hue1 + 30}, 70%, 50%, ${opacity1 / 2}))`
            particle.style.filter = `blur(${size / 4}px)`
            break

          case 1: // Квадрат с закругленными углами
            const radius = Math.random() * 10
            particle.style.borderRadius = `${radius}px`
            const hue2 = 220 + Math.random() * 40
            const opacity2 = 0.05 + Math.random() * 0.15
            particle.style.background = `linear-gradient(135deg,
              hsla(${hue2}, 80%, 60%, ${opacity2}),
              hsla(${hue2 - 20}, 70%, 40%, ${opacity2 / 2}))`
            particle.style.filter = `blur(${size / 3}px)`
            break

          case 2: // Мягкий "blob" с неправильной формой
            const r1 = 30 + Math.random() * 40
            const r2 = 30 + Math.random() * 40
            const r3 = 30 + Math.random() * 40
            const r4 = 30 + Math.random() * 40
            particle.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`
            const hue3 = 180 + Math.random() * 80
            const opacity3 = 0.03 + Math.random() * 0.1
            particle.style.background = `linear-gradient(to right,
              hsla(${hue3}, 80%, 60%, ${opacity3}),
              hsla(${hue3 + 40}, 70%, 50%, ${opacity3 / 1.5}))`
            particle.style.filter = `blur(${size / 2}px)`
            break

          case 3: // Светящийся эффект
            particle.style.borderRadius = '50%'
            const hue4 = 210 + Math.random() * 30
            const opacity4 = 0.05 + Math.random() * 0.15
            particle.style.boxShadow = `0 0 ${size / 2}px ${size / 4}px hsla(${hue4}, 100%, 70%, ${opacity4})`
            particle.style.background = `hsla(${hue4}, 100%, 60%, ${opacity4 / 2})`
            particle.style.filter = `blur(${size / 3}px)`
            break
        }

        bgParticlesRef.current!.appendChild(particle)
        newParticles.push(particle)
      }

      setParticles(newParticles)
    }

    createParticles()

    // Очистка
    return () => {
      newParticles.forEach(particle => {
        if (bgParticlesRef.current?.contains(particle)) {
          bgParticlesRef.current.removeChild(particle)
        }
      })
    }
  }, [])

  // Анимация частиц фона
  useEffect(() => {
    if (!anime || particles.length === 0) return

    particles.forEach(particle => {
      // Случайные начальные параметры
      const duration = 15000 + Math.random() * 25000
      const delay = Math.random() * 5000
      const x = Math.random() * 150 - 75
      const y = Math.random() * 150 - 75

      // Анимация плавания
      anime({
        targets: particle,
        translateX: x,
        translateY: y,
        opacity: [
          { value: 0.1, duration: duration * 0.2, easing: 'easeInOutSine' },
          { value: 0.8, duration: duration * 0.6, easing: 'easeInOutSine' },
          { value: 0.1, duration: duration * 0.2, easing: 'easeInOutSine' },
        ],
        scale: [
          { value: 0.8, duration: duration * 0.3, easing: 'easeInOutQuad' },
          { value: 1.2, duration: duration * 0.4, easing: 'easeInOutQuad' },
          { value: 0.8, duration: duration * 0.3, easing: 'easeInOutQuad' },
        ],
        rotate: {
          value: Math.random() * 360 - 180,
          duration: duration,
          easing: 'easeInOutSine',
        },
        duration: duration,
        delay: delay,
        loop: true,
        direction: 'alternate',
      })
    })
  }, [particles])

  // Анимации иконок при фокусе
  useEffect(() => {
    if (!emailIconRef.current || !passwordIconRef.current) return

    // Анимация иконки email
    if (isEmailFocused) {
      gsap.to(emailIconRef.current, {
        scale: 1.2,
        color: '#6366f1',
        filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
        rotateY: 360,
        duration: 0.4,
        ease: 'back.out(1.7)',
      })
    } else {
      gsap.to(emailIconRef.current, {
        scale: 1,
        color: '#a5b4fc',
        filter: 'none',
        rotateY: 0,
        duration: 0.3,
        ease: 'power1.inOut',
      })
    }

    // Анимация иконки пароля
    if (isPasswordFocused) {
      gsap.to(passwordIconRef.current, {
        scale: 1.2,
        color: '#6366f1',
        filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
        rotateY: 360,
        duration: 0.4,
        ease: 'back.out(1.7)',
      })
    } else {
      gsap.to(passwordIconRef.current, {
        scale: 1,
        color: '#a5b4fc',
        filter: 'none',
        rotateY: 0,
        duration: 0.3,
        ease: 'power1.inOut',
      })
    }
  }, [isEmailFocused, isPasswordFocused])

  // Анимация кнопки при наведении
  useEffect(() => {
    if (!buttonRef.current) return

    // Добавляем обработчики событий
    const button = buttonRef.current

    const handleMouseEnter = () => {
      if (isLoading) return

      gsap.to(button, {
        scale: 1.03,
        boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.6)',
        duration: 0.3,
        ease: 'power2.out',
      })

      // Создаем эффект сияния
      gsap.to(button.querySelector('.button-glow'), {
        opacity: 0.8,
        duration: 0.5,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      if (isLoading) return

      gsap.to(button, {
        scale: 1,
        boxShadow: '0 4px 10px -2px rgba(79, 70, 229, 0.3)',
        duration: 0.3,
        ease: 'power2.in',
      })

      // Убираем эффект сияния
      gsap.to(button.querySelector('.button-glow'), {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      })
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isLoading])

  // Функция переворота формы с улучшенной анимацией
  const handleFlip = () => {
    if (formContainerRef.current) {
      if (isFlipped) {
        gsap.to(formContainerRef.current, {
          rotateY: 0,
          duration: 0.8,
          ease: 'power3.inOut',
          onComplete: () => setIsFlipped(false),
        })
      } else {
        gsap.to(formContainerRef.current, {
          rotateY: 180,
          duration: 0.8,
          ease: 'power3.inOut',
          onComplete: () => setIsFlipped(true),
        })
      }
    }
  }

  // Инициализация формы
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  // Обработчики фокуса для полей ввода
  const handleEmailFocus = () => {
    setIsEmailFocused(true)

    // Анимация контейнера поля
    const emailField = document.querySelector('.email-field-container')
    if (emailField) {
      gsap.to(emailField, {
        boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.5), 0 0 25px rgba(99, 102, 241, 0.4)',
        background: 'linear-gradient(to right, rgba(79, 70, 229, 0.15), rgba(79, 70, 229, 0.1))',
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }

  const handleEmailBlur = () => {
    setIsEmailFocused(false)

    // Анимация контейнера поля
    const emailField = document.querySelector('.email-field-container')
    if (emailField) {
      gsap.to(emailField, {
        boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.2), 0 0 10px rgba(99, 102, 241, 0.1)',
        background: 'linear-gradient(to right, rgba(79, 70, 229, 0.05), rgba(79, 70, 229, 0.02))',
        duration: 0.3,
        ease: 'power2.in',
      })
    }
  }

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true)

    // Анимация контейнера поля
    const passwordField = document.querySelector('.password-field-container')
    if (passwordField) {
      gsap.to(passwordField, {
        boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.5), 0 0 25px rgba(99, 102, 241, 0.4)',
        background: 'linear-gradient(to right, rgba(79, 70, 229, 0.15), rgba(79, 70, 229, 0.1))',
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false)

    // Анимация контейнера поля
    const passwordField = document.querySelector('.password-field-container')
    if (passwordField) {
      gsap.to(passwordField, {
        boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.2), 0 0 10px rgba(99, 102, 241, 0.1)',
        background: 'linear-gradient(to right, rgba(79, 70, 229, 0.05), rgba(79, 70, 229, 0.02))',
        duration: 0.3,
        ease: 'power2.in',
      })
    }
  }

  // Обработка отправки формы
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)

    // Анимация кнопки при загрузке
    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 0.98,
        boxShadow: '0 2px 5px -1px rgba(79, 70, 229, 0.2)',
        duration: 0.2,
      })
    }

    const toastId = toast.loading('Выполняется вход...')

    try {
      const variables = {
        input: {
          email: data.email,
          password: data.password,
        },
      }

      const response = await graphqlClient.request<{ login: { token: string; user: LoggedInUser } }>(
        LOGIN_MUTATION,
        variables,
      )

      if (response.login?.token && response.login?.user) {
        const { token, user } = response.login
        Cookies.set('auth_token', token, {
          expires: data.remember ? 30 : 7,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        })
        localStorage.setItem('user', JSON.stringify(user))

        // Анимация успешного входа
        setLoginSuccess(true)
        toast.success(`Добро пожаловать, ${user.firstName || user.email}!`, { id: toastId })

        // Эффект успешного входа с анимацией
        if (formContainerRef.current) {
          // Создаем световой эффект успеха
          const successOverlay = document.createElement('div')
          successOverlay.style.position = 'absolute'
          successOverlay.style.inset = '0'
          successOverlay.style.background =
            'radial-gradient(circle, rgba(52, 211, 153, 0.8) 0%, rgba(52, 211, 153, 0) 70%)'
          successOverlay.style.opacity = '0'
          successOverlay.style.zIndex = '10'
          successOverlay.style.pointerEvents = 'none'
          formContainerRef.current.appendChild(successOverlay)

          // Анимируем эффект
          gsap.to(successOverlay, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => {
              // Анимируем исчезновение формы
              gsap.to(formContainerRef.current, {
                y: -30,
                opacity: 0,
                scale: 0.9,
                duration: 0.6,
                delay: 0.5,
                ease: 'power3.in',
                onComplete: () => {
                  // Перенаправляем пользователя
                  setTimeout(() => {
                    if (user.role === 'ADMIN') router.push('/admin/dashboard')
                    else if (user.role === 'PROCUREMENT_MANAGER') router.push('/manager/dashboard')
                    else router.push('/specialist/dashboard')
                  }, 300)
                },
              })
            },
          })
        }
      } else {
        throw new Error('Некорректный ответ от сервера')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage =
        error.response?.errors?.[0]?.message || error.message || 'Ошибка входа. Проверьте email и пароль.'

      // Анимация ошибки входа
      setLoginError(true)

      // Эффект тряски и красного свечения при ошибке
      if (formContainerRef.current) {
        // Добавляем красное свечение
        gsap.to(formContainerRef.current, {
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.3)',
          duration: 0.3,
          ease: 'power1.out',
        })

        // Эффект тряски
        gsap.to(formContainerRef.current, {
          x: [-8, 8, -6, 6, -4, 4, 0],
          duration: 0.5,
          ease: 'power1.inOut',
          onComplete: () => {
            // Возвращаем обычное состояние
            gsap.to(formContainerRef.current, {
              boxShadow: 'none',
              duration: 0.5,
              delay: 0.5,
              ease: 'power1.out',
              onComplete: () => {
                setLoginError(false)
                setIsLoading(false)

                // Возвращаем кнопку в нормальное состояние
                if (buttonRef.current) {
                  gsap.to(buttonRef.current, {
                    scale: 1,
                    boxShadow: '0 4px 10px -2px rgba(79, 70, 229, 0.3)',
                    duration: 0.3,
                  })
                }
              },
            })
          },
        })
      }

      toast.error(errorMessage, { id: toastId })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Фоновые градиенты */}
      <div
        ref={loginBgRef}
        className="fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(67, 56, 202, 0.1) 0%, rgba(17, 24, 39, 0) 50%), radial-gradient(circle at bottom right, rgba(79, 70, 229, 0.08) 0%, rgba(17, 24, 39, 0) 50%)',
          backgroundSize: '200% 200%',
        }}></div>

      {/* Фоновые частицы */}
      <div ref={bgParticlesRef} className="fixed inset-0 pointer-events-none z-0"></div>

      {/* Основной контейнер с эффектом переворота */}
      <div
        ref={formContainerRef}
        className="w-full max-w-[420px] relative"
        style={{
          perspective: '2000px',
          transformStyle: 'preserve-3d',
          opacity: 0, // Начальное состояние для анимации
        }}>
        {/* Фронтальная сторона (форма логина) */}
        <div
          className={`w-full backdrop-blur-xl rounded-2xl overflow-hidden relative ${
            isFlipped ? 'backface-hidden' : ''
          }`}
          style={{
            backfaceVisibility: 'hidden',
            boxShadow: '0 15px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}>
          {/* Глассморфизм-эффект */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-indigo-900/30 to-gray-900/70 z-0"></div>
          <div className="absolute -inset-[100px] bg-gradient-to-tl from-indigo-500/20 via-transparent to-cyan-500/20 blur-3xl z-0 opacity-60"></div>

          {/* Блики на стекле */}
          <div
            className="absolute top-0 right-0 w-[150px] h-[120px] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-lg z-0 opacity-40"
            style={{ transform: 'translate(30%, -30%)' }}></div>

          <div
            className="absolute bottom-0 left-0 w-[100px] h-[80px] bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-lg z-0 opacity-30"
            style={{ transform: 'translate(-20%, 40%)' }}></div>

          {/* Модная рамка с градиентом */}
          <div className="absolute inset-0 border border-gray-800 rounded-2xl z-0"></div>
          <div
            className="absolute inset-0 border border-transparent rounded-2xl z-0"
            style={{
              borderImageSlice: 1,
              borderImageSource:
                'linear-gradient(to bottom right, rgba(99, 102, 241, 0.4), rgba(59, 130, 246, 0.1), rgba(236, 72, 153, 0.3))',
            }}></div>

          {/* Содержимое формы */}
          <div className="relative z-10 p-8 rounded-2xl">
            {/* Логотип и заголовок */}
            <div className="flex flex-col items-center mb-8 relative">
              {/* Анимированный логотип */}
              <div className="mb-2 relative">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl"></div>
                <SupplierStaticLogo size={100} />
              </div>

              {/* Заголовок с градиентной анимацией */}
              <h1
                ref={titleRef}
                className="text-2xl font-bold mt-4 text-center relative"
                style={{
                  opacity: 0, // Начальное состояние для анимации
                  backgroundImage: 'linear-gradient(90deg, #4f46e5, #8b5cf6, #3b82f6, #0ea5e9, #8b5cf6, #4f46e5)',
                  backgroundSize: '200% auto',
                  color: 'transparent',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  animation: 'gradient-animation 8s linear infinite',
                }}>
                Система Управления Поставщиками
              </h1>

              <style jsx>{`
                @keyframes gradient-animation {
                  0% {
                    background-position: 0% center;
                  }
                  100% {
                    background-position: 200% center;
                  }
                }
              `}</style>

              <p className="text-gray-300 mt-2 text-center">Вход в систему</p>
            </div>

            {/* Форма входа */}
            <Form {...form}>
              <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <div
                        className="email-field-container relative overflow-hidden rounded-lg"
                        style={{
                          transition: 'all 0.3s ease',
                          boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.2), 0 0 10px rgba(99, 102, 241, 0.1)',
                          background: 'linear-gradient(to right, rgba(79, 70, 229, 0.05), rgba(79, 70, 229, 0.02))',
                        }}>
                        <div
                          className="absolute inset-0 z-0 opacity-30"
                          style={{
                            background: 'radial-gradient(circle at center, rgba(79, 70, 229, 0.2) 0%, transparent 70%)',
                          }}></div>

                        <div className="relative z-10 flex items-center">
                          <div
                            ref={emailIconRef}
                            className="absolute left-3 flex items-center justify-center"
                            style={{ color: '#a5b4fc' }}>
                            <Icon icon="solar:user-bold" width={22} height={22} />
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Введите ваш email"
                              className="border-0 bg-transparent text-white h-12 pl-12 pr-4 focus:ring-0 focus:outline-none"
                              onFocus={handleEmailFocus}
                              onBlur={handleEmailBlur}
                              style={{ caretColor: '#6366f1' }}
                            />
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage className="text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Пароль</FormLabel>
                      <div
                        className="password-field-container relative overflow-hidden rounded-lg"
                        style={{
                          transition: 'all 0.3s ease',
                          boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.2), 0 0 10px rgba(99, 102, 241, 0.1)',
                          background: 'linear-gradient(to right, rgba(79, 70, 229, 0.05), rgba(79, 70, 229, 0.02))',
                        }}>
                        <div
                          className="absolute inset-0 z-0 opacity-30"
                          style={{
                            background: 'radial-gradient(circle at center, rgba(79, 70, 229, 0.2) 0%, transparent 70%)',
                          }}></div>

                        <div className="relative z-10 flex items-center">
                          <div
                            ref={passwordIconRef}
                            className="absolute left-3 flex items-center justify-center"
                            style={{ color: '#a5b4fc' }}>
                            <Icon icon="solar:lock-password-bold" width={22} height={22} />
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className="border-0 bg-transparent text-white h-12 pl-12 pr-4 focus:ring-0 focus:outline-none"
                              onFocus={handlePasswordFocus}
                              onBlur={handlePasswordBlur}
                              style={{ caretColor: '#6366f1' }}
                            />
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage className="text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 border-gray-600 rounded"
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-gray-300 text-sm">Запомнить меня</FormLabel>
                      </FormItem>
                    )}
                  />
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-all duration-200">
                    Забыли пароль?
                  </Link>
                </div>

                {/* Улучшенная кнопка входа */}
                <button
                  ref={buttonRef}
                  type="submit"
                  className="w-full h-12 relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium flex items-center justify-center mt-6"
                  disabled={isLoading}
                  style={{
                    boxShadow: '0 4px 10px -2px rgba(79, 70, 229, 0.3)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                  }}>
                  {/* Фон кнопки с градиентом */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 bg-size-200 z-0"></div>

                  {/* Эффект при наведении */}
                  <div className="button-glow absolute inset-0 bg-gradient-to-r from-indigo-400/40 via-violet-400/40 to-indigo-400/40 blur-md z-0 opacity-0"></div>

                  {/* Эффект блика кнопки */}
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 animate-shine"></div>

                  {/* Текст кнопки */}
                  <span className="relative z-10 flex items-center">
                    {isLoading ? (
                      <>
                        <Icon icon="svg-spinners:6-dots-scale" className="mr-2 h-5 w-5" />
                        Выполняется вход...
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:login-3-bold" className="mr-2 h-5 w-5" />
                        Войти в систему
                      </>
                    )}
                  </span>
                </button>

                <div className="flex items-center justify-center pt-4">
                  <div className="text-sm text-gray-400">
                    Нет аккаунта?{' '}
                    <Link
                      href="/auth/register"
                      className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200 relative">
                      <span>Зарегистрироваться</span>
                      <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-indigo-400 to-indigo-300 transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"></span>
                    </Link>
                  </div>
                </div>

                {/* Кнопка переворота формы */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleFlip}
                    className="text-xs px-4 py-2 rounded-full bg-gray-800/70 text-gray-300 hover:bg-gray-700/70 transition-all duration-200 flex items-center space-x-1.5 border border-indigo-500/30"
                    style={{
                      boxShadow: '0 2px 6px -1px rgba(79, 70, 229, 0.2)',
                      transform: 'translateZ(0)', // Для аппаратного ускорения
                    }}>
                    <Icon icon="solar:restart-bold" className="h-3.5 w-3.5" />
                    <span>Перевернуть форму</span>

                    {/* Эффект подсветки при наведении */}
                    <div className="absolute inset-0 rounded-full overflow-hidden opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 animate-pulse"></div>
                    </div>
                  </button>
                </div>
              </form>
            </Form>

            {/* Демо-доступ */}
            <div className="mt-6 p-4 rounded-lg border border-indigo-500/20 text-sm relative overflow-hidden">
              {/* Фон для блока с демо-данными */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-indigo-950/40 to-gray-900/30 backdrop-blur-sm z-0"></div>

              <div className="relative z-10">
                <div className="font-medium text-indigo-400 mb-2 flex items-center">
                  <Icon icon="solar:info-circle-bold" className="mr-1.5 h-4 w-4" />
                  Демо-доступ:
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-300">
                  <div className="opacity-80">Email:</div>
                  <div className="font-mono text-white">admin@example.com</div>
                  <div className="opacity-80">Пароль:</div>
                  <div className="font-mono text-white">admin123</div>
                </div>
              </div>

              {/* Декоративные элементы */}
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-bl-full opacity-50"></div>
              <div className="absolute bottom-0 left-0 h-10 w-10 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-tr-full opacity-40"></div>
            </div>
          </div>
        </div>

        {/* Задняя сторона формы */}
        <div
          className={`absolute inset-0 bg-transparent ${isFlipped ? '' : 'backface-hidden'}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}>
          <BacksideLogin onFlip={handleFlip} />
        </div>
      </div>

      {/* Анимация успешного входа */}
      {loginSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-30 bg-black/30 backdrop-blur-sm">
          <div
            className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-green-500/30 shadow-xl shadow-green-500/10"
            style={{
              animation: 'successPopIn 0.5s forwards',
            }}>
            <style jsx>{`
              @keyframes successPopIn {
                0% {
                  transform: scale(0.9);
                  opacity: 0;
                }
                40% {
                  transform: scale(1.1);
                  opacity: 1;
                }
                100% {
                  transform: scale(1);
                  opacity: 1;
                }
              }

              @keyframes pulseSuccess {
                0% {
                  transform: scale(1);
                  opacity: 0.8;
                }
                50% {
                  transform: scale(1.1);
                  opacity: 1;
                }
                100% {
                  transform: scale(1);
                  opacity: 0.8;
                }
              }
            `}</style>

            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                style={{
                  background: 'radial-gradient(circle, rgba(52, 211, 153, 0.3) 0%, rgba(52, 211, 153, 0.1) 70%)',
                  animation: 'pulseSuccess 2s infinite',
                }}>
                <Icon icon="solar:check-circle-bold" className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Успешный вход</h2>
              <p className="text-gray-300">Перенаправление в систему...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
