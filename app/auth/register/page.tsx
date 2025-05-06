'use client'

import '../styles.css'
import '../styles/gradients.css'
import '../styles/button-effects.css'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
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
import gsap from 'gsap'

// Кастомные компоненты - импортируем логотип из логин-формы
import GradientWaveBackground from '../components/GradientWaveBackground'
const SupplierStaticLogo = dynamic(() => import('../components/SupplierStaticLogo'), { ssr: false })

// Импорт Anime.js для дополнительных анимаций
let anime
if (typeof window !== 'undefined') {
  anime = require('animejs').default
}

// Компоненты UI
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// Схема валидации Zod
const registerSchema = z
  .object({
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
    password: z
      .string()
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
      .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
    confirmPassword: z.string(),
    terms: z.boolean().refine(val => val === true, {
      message: 'Вы должны принять условия использования',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

// GraphQL
const graphqlEndpoint = process.env.NEXT_PUBLIC_API_URL || '/graphql'
const graphqlClient = new GraphQLClient(graphqlEndpoint)
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
`

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const bgParticlesRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<HTMLDivElement[]>([])
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const formElements = useRef<(HTMLDivElement | null)[]>([])
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  const sections = [
    { title: 'Данные компании', icon: 'heroicons:building-office-2' },
    { title: 'Контактное лицо', icon: 'heroicons:user' },
    { title: 'Данные для входа', icon: 'heroicons:lock-closed' },
  ]

  // Создание фоновых частиц при загрузке
  useEffect(() => {
    if (typeof window === 'undefined' || !bgParticlesRef.current) return

    // Очищаем существующие частицы
    while (bgParticlesRef.current.firstChild) {
      bgParticlesRef.current.removeChild(bgParticlesRef.current.firstChild)
    }

    // Создаем разные типы частиц
    const particleCount = 25
    const newParticles: HTMLDivElement[] = []

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.classList.add('bg-particle')

      // Определяем тип частицы
      const particleType = Math.floor(Math.random() * 4)

      // Размер и позиция
      const size = 15 + Math.random() * 35
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`
      particle.style.position = 'absolute'
      particle.style.left = `${Math.random() * 100}%`
      particle.style.top = `${Math.random() * 100}%`
      particle.style.opacity = '0'
      particle.style.zIndex = '-1'

      // Стили в зависимости от типа
      switch (particleType) {
        case 0: // Круг с градиентом
          particle.style.borderRadius = '50%'
          const hue1 = 180 + Math.random() * 40 // Бирюзово-голубой диапазон
          particle.style.background = `radial-gradient(circle at center, hsla(${hue1}, 70%, 60%, 0.15), hsla(${
            hue1 + 20
          }, 60%, 40%, 0.05))`
          particle.style.filter = `blur(${size / 3}px)`
          break

        case 1: // Квадрат с закругленными углами
          const radius = Math.random() * 15
          particle.style.borderRadius = `${radius}px`
          const hue2 = 200 + Math.random() * 40 // Синий диапазон
          particle.style.background = `linear-gradient(135deg, hsla(${hue2}, 70%, 50%, 0.1), hsla(${
            hue2 - 30
          }, 60%, 40%, 0.03))`
          particle.style.filter = `blur(${size / 4}px)`
          break

        case 2: // Бесформенный блоб
          const r1 = 30 + Math.random() * 40
          const r2 = 30 + Math.random() * 40
          const r3 = 30 + Math.random() * 40
          const r4 = 30 + Math.random() * 40
          particle.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`
          const hue3 = 170 + Math.random() * 60 // Бирюзово-синий диапазон
          particle.style.background = `linear-gradient(to right, hsla(${hue3}, 70%, 50%, 0.08), hsla(${
            hue3 + 40
          }, 60%, 40%, 0.04))`
          particle.style.filter = `blur(${size / 2.5}px)`
          break

        case 3: // Светящийся эффект
          particle.style.borderRadius = '50%'
          const hue4 = 180 + Math.random() * 40 // Бирюзовый диапазон
          particle.style.boxShadow = `0 0 ${size / 2}px ${size / 4}px hsla(${hue4}, 80%, 60%, 0.1)`
          particle.style.background = `hsla(${hue4}, 80%, 60%, 0.06)`
          particle.style.filter = `blur(${size / 3}px)`
          break
      }

      bgParticlesRef.current.appendChild(particle)
      newParticles.push(particle)
    }

    setParticles(newParticles)
  }, [])

  // Анимируем частицы с помощью Anime.js
  useEffect(() => {
    if (!anime || particles.length === 0) return

    // Сначала анимируем появление частиц
    anime
      .timeline({
        targets: particles,
        delay: anime.stagger(100, { from: 'random' }),
      })
      .add({
        opacity: [0, 0.6],
        scale: [0.5, 1],
        duration: 1500,
        easing: 'easeOutElastic(1, .5)',
      })
      .add(
        {
          targets: particles,
          translateX: () => anime.random(-100, 100),
          translateY: () => anime.random(-100, 100),
          rotate: () => anime.random(-180, 180),
          opacity: [0.6, 0.2, 0.6],
          scale: [1, 1.2, 1],
          duration: () => anime.random(20000, 40000),
          easing: 'easeInOutSine',
          loop: true,
          direction: 'alternate',
          delay: () => anime.random(0, 5000),
        },
        '-=1000',
      )
  }, [particles])

  // Инициализация GSAP анимаций
  useLayoutEffect(() => {
    if (!mainRef.current || !cardRef.current) return

    const ctx = gsap.context(() => {
      // Анимация появления карточки
      gsap.fromTo(
        cardRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'expo.out' },
      )

      // Анимация заголовка
      const title = document.querySelector('.card-title')
      if (title) {
        gsap.fromTo(
          title,
          { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', opacity: 0 },
          {
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            opacity: 1,
            duration: 1.2,
            delay: 0.3,
            ease: 'power4.out',
          },
        )
      }

      // Анимация разделов формы с задержкой
      sectionRefs.current.forEach((section, index) => {
        if (!section) return
        gsap.fromTo(
          section,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, delay: 0.5 + index * 0.15, ease: 'back.out(1.4)' },
        )
      })

      // Анимация полей внутри активного раздела
      if (sectionRefs.current[activeSectionIndex]) {
        const fields = sectionRefs.current[activeSectionIndex].querySelectorAll('.form-field')
        gsap.fromTo(
          fields,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, delay: 1, ease: 'power3.out' },
        )
      }
    }, mainRef)

    return () => ctx.revert() // Очистка анимации
  }, [])

  // Эффект свечения за курсором
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return

      const rect = mainRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      gsap.to('.cursor-glow', {
        x,
        y,
        duration: 1,
        ease: 'power2.out',
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Функция для анимации переключения разделов формы
  const switchSection = (index: number) => {
    if (index === activeSectionIndex) return

    // Анимация скрытия текущего раздела
    if (sectionRefs.current[activeSectionIndex]) {
      gsap.to(sectionRefs.current[activeSectionIndex], {
        y: -20,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          // После скрытия текущего раздела показываем новый
          setActiveSectionIndex(index)

          // Анимация появления нового раздела
          if (sectionRefs.current[index]) {
            gsap.fromTo(
              sectionRefs.current[index],
              { y: 30, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
            )

            // Анимация полей в новом разделе
            const fields = sectionRefs.current[index].querySelectorAll('.form-field')
            gsap.fromTo(
              fields,
              { y: 15, opacity: 0 },
              { y: 0, opacity: 1, stagger: 0.06, duration: 0.4, ease: 'power2.out' },
            )
          }
        },
      })
    } else {
      setActiveSectionIndex(index)
    }
  }

  // Анимация кнопок навигации между разделами
  const animateNavButton = (isHover: boolean, element: HTMLElement) => {
    gsap.to(element, {
      scale: isHover ? 1.05 : 1,
      backgroundColor: isHover ? 'rgba(0, 188, 212, 0.15)' : 'rgba(15, 23, 42, 0.3)',
      boxShadow: isHover
        ? '0 0 15px rgba(0, 188, 212, 0.4), 0 0 0 1px rgba(0, 188, 212, 0.5)'
        : '0 0 0 1px rgba(148, 163, 184, 0.2)',
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  // Анимация при наведении на основную кнопку регистрации
  const handleButtonHover = (isHover: boolean) => {
    const button = document.querySelector('.register-button')
    if (!button) return

    gsap.to(button, {
      scale: isHover ? 1.03 : 1,
      boxShadow: isHover
        ? '0 10px 25px -5px rgba(0, 188, 212, 0.4), 0 0 0 2px rgba(0, 188, 212, 0.2)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      backgroundPosition: isHover ? '100% 0' : '0 0',
      duration: 0.3,
      ease: 'power2.out',
    })

    // Анимируем свечение кнопки
    const glow = button.querySelector('.button-glow')
    if (glow) {
      gsap.to(glow, {
        opacity: isHover ? 0.8 : 0,
        duration: 0.3,
      })
    }
  }

  // Обработчик для анимации сложности пароля
  const handlePasswordChange = (value: string) => {
    const strength = calculatePasswordStrength(value)
    setPasswordStrength(strength)

    const strengthBar = document.querySelector('.password-strength-bar')
    if (!strengthBar) return

    let width = `${strength * 25}%`
    let color

    if (strength === 0) color = '#ef4444' // red-500
    else if (strength === 1) color = '#ef4444' // red-500
    else if (strength === 2) color = '#eab308' // yellow-500
    else if (strength === 3) color = '#3b82f6' // blue-500
    else color = '#00BCD4' // teal

    gsap.to(strengthBar, {
      width,
      backgroundColor: color,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  // Функция для расчета сложности пароля (0-4)
  const calculatePasswordStrength = (password: string) => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  // Анимация полей формы при фокусе
  const handleFieldFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const fieldContainer = event.target.closest('.field-container')
    if (!fieldContainer) return

    gsap.to(fieldContainer, {
      boxShadow: '0 0 0 2px rgba(0, 188, 212, 0.4), 0 0 20px rgba(0, 188, 212, 0.2)',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      duration: 0.3,
      ease: 'power2.out',
    })

    // Анимируем иконку
    const icon = fieldContainer.querySelector('.field-icon')
    if (icon) {
      gsap.to(icon, {
        scale: 1.2,
        color: '#00BCD4',
        duration: 0.3,
        ease: 'back.out(1.7)',
      })
    }
  }

  const handleFieldBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const fieldContainer = event.target.closest('.field-container')
    if (!fieldContainer) return

    gsap.to(fieldContainer, {
      boxShadow: '0 0 0 1px rgba(100, 116, 139, 0.3)',
      backgroundColor: 'rgba(15, 23, 42, 0.3)',
      duration: 0.3,
      ease: 'power2.in',
    })

    // Возвращаем иконку в исходное состояние
    const icon = fieldContainer.querySelector('.field-icon')
    if (icon) {
      gsap.to(icon, {
        scale: 1,
        color: 'rgba(148, 163, 184, 0.8)',
        duration: 0.3,
        ease: 'power2.in',
      })
    }
  }

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
      terms: false,
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)

    // Анимация кнопки при загрузке
    const button = document.querySelector('.register-button')
    if (button) {
      gsap.to(button, {
        scale: 0.98,
        boxShadow: '0 2px 5px -1px rgba(0, 0, 0, 0.2)',
        duration: 0.2,
      })
    }

    const toastId = toast.loading('Создание аккаунта...')

    try {
      // Формируем данные для запроса в соответствии с SupplierRegistrationInput
      const { confirmPassword, terms, password, ...supplierData } = data

      // categoryIds обязательный в схеме GraphQL, но в резолвере он извлекается и может быть пустым
      const variables = {
        input: {
          ...supplierData,
          categoryIds: [], // Пустой массив по умолчанию, в будущем можно добавить выбор категорий
        },
      }

      const response = await graphqlClient.request<{
        registerSupplier: {
          success: boolean
          message: string
          supplier: { id: string; name: string; email: string } | null
        }
      }>(REGISTER_MUTATION, variables)

      const { success, message, supplier } = response.registerSupplier

      if (success && supplier) {
        setRegistrationSuccess(true)

        // Анимация успешной регистрации
        gsap
          .timeline({
            onComplete: () => {
              toast.success(message || `Регистрация успешна! Ваша заявка будет рассмотрена администрацией.`, {
                id: toastId,
              })

              setTimeout(() => {
                router.push('/auth/login')
              }, 2000)
            },
          })
          .to(cardRef.current, {
            scale: 0.95,
            y: -20,
            opacity: 0,
            duration: 0.5,
            ease: 'power3.in',
          })

        // Создаем анимацию успешной регистрации
        const successContainer = document.createElement('div')
        successContainer.className = 'fixed inset-0 flex items-center justify-center z-30'
        successContainer.innerHTML = `
          <div class="success-animation bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-teal-500/30 shadow-xl shadow-teal-500/10">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-600/20 mb-4">
                <svg class="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-white mb-2">Регистрация успешна!</h2>
              <p class="text-gray-300">Перенаправление на страницу входа...</p>
            </div>
          </div>
        `
        document.body.appendChild(successContainer)

        // Анимируем появление сообщения об успехе
        gsap.fromTo(
          successContainer.querySelector('.success-animation'),
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' },
        )
      } else {
        throw new Error(message || 'Неизвестная ошибка при регистрации')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage =
        error.response?.errors?.[0]?.message || error.message || 'Ошибка регистрации. Пожалуйста, попробуйте позже.'

      // Анимация ошибки
      gsap
        .timeline()
        .to(cardRef.current, {
          x: [-10, 10, -8, 8, -5, 5, -2, 2, 0],
          duration: 0.5,
          ease: 'power1.inOut',
        })
        .to(cardRef.current, {
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.3)',
          duration: 0.3,
          ease: 'power1.out',
          onComplete: () => {
            gsap.to(cardRef.current, {
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              duration: 0.5,
              delay: 0.5,
              ease: 'power1.out',
            })
          },
        })

      toast.error(errorMessage, { id: toastId })
      setIsLoading(false)

      // Возвращаем кнопку в нормальное состояние
      if (button) {
        gsap.to(button, {
          scale: 1,
          boxShadow: '0 4px 10px -2px rgba(0, 0, 0, 0.1)',
          duration: 0.3,
        })
      }
    }
  }

  return (
    <div
      ref={mainRef}
      className="flex min-h-screen items-center justify-center p-4 py-10 overflow-hidden relative bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
      {/* Градиентный фон с волнами */}
      <GradientWaveBackground />

      {/* Фоновые частицы */}
      <div ref={bgParticlesRef} className="fixed inset-0 pointer-events-none z-0"></div>

      {/* Эффект свечения за курсором */}
      <div
        className="cursor-glow absolute pointer-events-none bg-teal-500 opacity-5 blur-[120px] rounded-full w-[35vw] h-[35vw] max-w-[500px] max-h-[500px]"
        style={{
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Основная карточка */}
      <div ref={cardRef} className="w-full max-w-3xl relative z-10 py-4">
        <Card className="backdrop-blur-xl bg-slate-900/60 border-0 overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.25)]">
          {/* Фоновые градиенты */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/90 z-0"></div>
          <div className="absolute -inset-[100px] bg-gradient-to-tl from-teal-500/20 via-transparent to-indigo-600/20 blur-3xl z-0 opacity-30"></div>

          {/* Блики на стекле */}
          <div
            className="absolute top-0 right-0 w-[200px] h-[150px] bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl z-0 opacity-40"
            style={{ transform: 'translate(30%, -30%)' }}></div>

          <div
            className="absolute bottom-0 left-0 w-[150px] h-[100px] bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-xl z-0 opacity-30"
            style={{ transform: 'translate(-20%, 40%)' }}></div>

          {/* Градиентная рамка */}
          <div className="absolute inset-0 border border-slate-800 rounded-xl z-0"></div>
          <div
            className="absolute inset-0 border border-transparent rounded-xl z-1"
            style={{
              borderImageSlice: 1,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderImage:
                'linear-gradient(to bottom right, rgba(0, 188, 212, 0.3), rgba(59, 130, 246, 0.1), rgba(0, 188, 212, 0.2)) 1',
            }}></div>

          <CardHeader className="space-y-3 text-center p-6 relative z-10">
            <div className="flex justify-center mb-1">
              <div className="relative flex justify-center items-center h-20 w-20">
                {/* Анимированный логотип */}
                <div className="absolute inset-0 bg-teal-500/10 rounded-full blur-xl"></div>
                <SupplierStaticLogo size={80} />
              </div>
            </div>
            <CardTitle
              className="card-title text-3xl font-bold"
              style={{
                background: 'linear-gradient(90deg, #00BCD4, #4f46e5, #00BCD4)',
                backgroundSize: '200% auto',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                animation: 'gradient-shift 8s linear infinite',
              }}>
              Регистрация поставщика
            </CardTitle>
            <CardDescription className="text-slate-300 pt-1 text-lg">
              Создайте аккаунт для доступа к системе
            </CardDescription>

            {/* Добавляем стиль для анимации текста */}
            <style jsx global>{`
              @keyframes gradient-shift {
                0% {
                  background-position: 0% center;
                }
                100% {
                  background-position: 200% center;
                }
              }
            `}</style>
          </CardHeader>

          <CardContent className="p-6 md:p-8 relative z-10">
            {/* Навигация по разделам формы */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              {sections.map((section, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => switchSection(index)}
                  className={`relative flex flex-col items-center px-4 py-3 rounded-lg transition-all duration-300 ${
                    index === activeSectionIndex
                      ? 'bg-teal-600/20 text-white border border-teal-500/40'
                      : 'bg-slate-800/30 text-slate-300 border border-slate-700/40'
                  }`}
                  onMouseEnter={e => animateNavButton(true, e.currentTarget)}
                  onMouseLeave={e => animateNavButton(false, e.currentTarget)}>
                  <Icon
                    icon={section.icon}
                    className={`mb-1 h-6 w-6 ${index === activeSectionIndex ? 'text-teal-400' : 'text-slate-400'}`}
                  />
                  <span className="text-sm font-medium">{section.title}</span>

                  {/* Индикатор активного раздела */}
                  {index === activeSectionIndex && (
                    <div className="absolute -bottom-px left-0 w-full h-[2px] bg-gradient-to-r from-teal-500/50 via-teal-400 to-teal-500/50"></div>
                  )}
                </button>
              ))}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Раздел 1: Данные компании */}
                <div
                  ref={el => (sectionRefs.current[0] = el)}
                  className={`space-y-4 ${activeSectionIndex === 0 ? 'block' : 'hidden'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Название компании</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:building-office-2"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="ООО 'Название компании'"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="legalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Юридическое наименование</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:document-text"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Общество с ограниченной ответственностью 'Название компании'"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">ИНН</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:identification"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="7707083893"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">ОГРН</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:document-check"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="1027700132195"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
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

                  <div className="form-field">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-[15px]">Адрес</FormLabel>
                          <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                            <div className="relative">
                              <Icon
                                icon="heroicons:map-pin"
                                className="field-icon absolute left-3 top-[14px] text-slate-400 transition-colors duration-200"
                                width={20}
                                height={20}
                              />
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="ул. Ленина, д. 1, офис 123"
                                  className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                  onFocus={handleFieldFocus}
                                  onBlur={handleFieldBlur}
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Город</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:building-office"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Москва"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Область/Регион</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:map"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Московская область"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Почтовый индекс</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:envelope"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="123456"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Страна</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:globe-alt"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Россия"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Телефон</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:phone"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="+7 (999) 123-45-67"
                                    type="tel"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Email компании</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:at-symbol"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="company@example.com"
                                    type="email"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
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

                  <div className="form-field">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-[15px]">Веб-сайт</FormLabel>
                          <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                            <div className="relative">
                              <Icon
                                icon="heroicons:globe-alt"
                                className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                width={20}
                                height={20}
                              />
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="https://www.example.com"
                                  className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                  onFocus={handleFieldFocus}
                                  onBlur={handleFieldBlur}
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="form-field">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-[15px]">Описание компании</FormLabel>
                          <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                            <div className="relative">
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Краткое описание вашей компании, сфера деятельности, специализация..."
                                  className="min-h-[100px] px-4 py-3 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                  onFocus={handleFieldFocus as any}
                                  onBlur={handleFieldBlur as any}
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Кнопка перехода к следующему разделу */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchSection(1)}
                      className="relative overflow-hidden px-6 py-3 text-white rounded-lg shadow-lg transition-all duration-300 bg-gradient-to-r from-teal-500 to-teal-600 hover:bg-gradient-to-r hover:from-teal-400 hover:to-teal-500"
                      onMouseEnter={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1.05,
                          boxShadow: '0 5px 15px rgba(0, 188, 212, 0.4)',
                          duration: 0.3,
                          ease: 'power2.out',
                        })
                      }}
                      onMouseLeave={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          duration: 0.3,
                          ease: 'power2.in',
                        })
                      }}>
                      <span className="relative z-10 flex items-center">
                        <span>Далее</span>
                        <Icon icon="heroicons:arrow-right" className="ml-2 h-5 w-5" />
                      </span>
                      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 animate-shine"></div>
                    </button>
                  </div>
                </div>

                {/* Раздел 2: Контактное лицо */}
                <div
                  ref={el => (sectionRefs.current[1] = el)}
                  className={`space-y-4 ${activeSectionIndex === 1 ? 'block' : 'hidden'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="contactPersonName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">ФИО</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:user"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Иванов Иван Иванович"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="contactPersonEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Email</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:envelope"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="contact@example.com"
                                    type="email"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                  />
                                </FormControl>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="contactPersonPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Телефон</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:phone"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="+7 (999) 123-45-67"
                                    type="tel"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
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

                  {/* Навигационные кнопки */}
                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => switchSection(0)}
                      className="relative overflow-hidden px-6 py-3 text-white bg-slate-700 hover:bg-slate-600 rounded-lg shadow-lg transition-all duration-300"
                      onMouseEnter={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1.05,
                          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
                          duration: 0.3,
                          ease: 'power2.out',
                        })
                      }}
                      onMouseLeave={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          duration: 0.3,
                          ease: 'power2.in',
                        })
                      }}>
                      <span className="relative z-10 flex items-center">
                        <Icon icon="heroicons:arrow-left" className="mr-2 h-5 w-5" />
                        <span>Назад</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => switchSection(2)}
                      className="relative overflow-hidden px-6 py-3 text-white rounded-lg shadow-lg transition-all duration-300 bg-gradient-to-r from-teal-500 to-teal-600 hover:bg-gradient-to-r hover:from-teal-400 hover:to-teal-500"
                      onMouseEnter={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1.05,
                          boxShadow: '0 5px 15px rgba(0, 188, 212, 0.4)',
                          duration: 0.3,
                          ease: 'power2.out',
                        })
                      }}
                      onMouseLeave={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          duration: 0.3,
                          ease: 'power2.in',
                        })
                      }}>
                      <span className="relative z-10 flex items-center">
                        <span>Далее</span>
                        <Icon icon="heroicons:arrow-right" className="ml-2 h-5 w-5" />
                      </span>
                      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 animate-shine"></div>
                    </button>
                  </div>
                </div>

                {/* Раздел 3: Данные для входа */}
                <div
                  ref={el => (sectionRefs.current[2] = el)}
                  className={`space-y-4 ${activeSectionIndex === 2 ? 'block' : 'hidden'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Пароль</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:lock-closed"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
                                    onChange={e => {
                                      field.onChange(e)
                                      handlePasswordChange(e.target.value)
                                    }}
                                  />
                                </FormControl>
                              </div>

                              {/* Индикатор сложности пароля с анимацией */}
                              <div className="h-1 mt-1 bg-slate-800 rounded overflow-hidden">
                                <div className="password-strength-bar h-full rounded" style={{ width: '0%' }}></div>
                              </div>
                              <div className="flex justify-between text-[10px] mt-1 text-slate-400">
                                <span>Слабый</span>
                                <span>Средний</span>
                                <span>Сильный</span>
                                <span>Надежный</span>
                              </div>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-field">
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 text-[15px]">Подтверждение пароля</FormLabel>
                            <div className="field-container relative group overflow-hidden rounded-lg transition-all duration-300 bg-slate-800/30 border border-slate-700/50">
                              <div className="relative">
                                <Icon
                                  icon="heroicons:lock-closed"
                                  className="field-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200"
                                  width={20}
                                  height={20}
                                />
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500"
                                    onFocus={handleFieldFocus}
                                    onBlur={handleFieldBlur}
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

                  <div className="form-field pt-2">
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
                              Я принимаю{' '}
                              <a href="#" className="text-teal-400 hover:text-teal-300 underline-animation">
                                условия использования
                              </a>{' '}
                              и{' '}
                              <a href="#" className="text-teal-400 hover:text-teal-300 underline-animation">
                                политику конфиденциальности
                              </a>
                            </FormLabel>
                            <FormMessage className="text-red-400" />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Навигационные кнопки и кнопка отправки */}
                  <div className="flex flex-col md:flex-row justify-between items-center pt-6 gap-4">
                    <button
                      type="button"
                      onClick={() => switchSection(1)}
                      className="w-full md:w-auto relative overflow-hidden px-6 py-3 text-white bg-slate-700 hover:bg-slate-600 rounded-lg shadow-lg transition-all duration-300"
                      onMouseEnter={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1.05,
                          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
                          duration: 0.3,
                          ease: 'power2.out',
                        })
                      }}
                      onMouseLeave={e => {
                        gsap.to(e.currentTarget, {
                          scale: 1,
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          duration: 0.3,
                          ease: 'power2.in',
                        })
                      }}>
                      <span className="relative z-10 flex items-center">
                        <Icon icon="heroicons:arrow-left" className="mr-2 h-5 w-5" />
                        <span>Назад</span>
                      </span>
                    </button>

                    <button
                      type="submit"
                      className="register-button w-full md:w-auto relative overflow-hidden px-8 py-3 text-white font-medium rounded-lg transition-all duration-300 h-12"
                      style={{
                        background: 'linear-gradient(90deg, #00BCD4 0%, #3B82F6 50%, #00BCD4 100%)',
                        backgroundSize: '200% auto',
                        boxShadow: '0 4px 15px rgba(0, 188, 212, 0.3)',
                      }}
                      onMouseEnter={() => handleButtonHover(true)}
                      onMouseLeave={() => handleButtonHover(false)}
                      disabled={isLoading}>
                      <div className="button-glow absolute inset-0 bg-gradient-to-r from-teal-400/40 via-blue-400/40 to-teal-400/40 blur-md z-0 opacity-0"></div>

                      <span className="relative z-10 flex items-center justify-center">
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
                      </span>

                      {/* Эффект блика кнопки */}
                      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 animate-shine"></div>
                    </button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col items-center p-4 pt-0 border-t border-slate-800/50 mt-6 relative z-10">
            <div className="text-sm text-slate-300">
              Уже есть аккаунт?{' '}
              <Link
                href="/auth/login"
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200 underline-animation">
                Войти
              </Link>
            </div>

            <style jsx global>{`
              .underline-animation {
                position: relative;
              }

              .underline-animation::after {
                content: '';
                position: absolute;
                width: 100%;
                height: 1px;
                bottom: -1px;
                left: 0;
                background: linear-gradient(90deg, #00bcd4, #3b82f6);
                transform: scaleX(0);
                transform-origin: bottom right;
                transition: transform 0.3s ease-out;
              }

              .underline-animation:hover::after {
                transform: scaleX(1);
                transform-origin: bottom left;
              }

              @keyframes shine {
                0% {
                  left: -100%;
                }
                100% {
                  left: 100%;
                }
              }

              .animate-shine {
                animation: shine 3s infinite;
              }
            `}</style>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
