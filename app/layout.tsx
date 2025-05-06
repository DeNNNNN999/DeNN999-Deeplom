'use client'

import './globals.css'
import { Inter, Raleway } from 'next/font/google'
import { Providers } from './providers'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Импорт GSAP и необходимых плагинов
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Регистрация плагинов GSAP на стороне клиента
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Шрифты для приложения
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const raleway = Raleway({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const backgroundRef = useRef<HTMLDivElement>(null)
  const pageWrapperRef = useRef<HTMLDivElement>(null)

  // Создание и анимация фоновых элементов
  useEffect(() => {
    if (!backgroundRef.current) return

    // Очищаем контейнер перед добавлением новых элементов
    const container = backgroundRef.current
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // Конфигурация фоновых элементов
    const config = {
      particleCount: 10, // Уменьшаем для производительности
      types: ['circle', 'blob', 'square'],
      minSize: 80,
      maxSize: 250,
      colors: ['#4f46e5', '#8b5cf6', '#3b82f6', '#2563eb', '#6366f1'],
    }

    // Создаем частицы фона
    const particles = []
    for (let i = 0; i < config.particleCount; i++) {
      const element = document.createElement('div')

      // Выбираем случайный тип и размер частицы
      const type = config.types[Math.floor(Math.random() * config.types.length)]
      const size = config.minSize + Math.random() * (config.maxSize - config.minSize)
      const color = config.colors[Math.floor(Math.random() * config.colors.length)]

      // Применяем общие стили
      element.classList.add('bg-particle')
      element.style.position = 'absolute'
      element.style.width = `${size}px`
      element.style.height = `${size}px`
      element.style.willChange = 'transform, opacity'
      element.style.zIndex = '-1'
      element.style.opacity = '0'

      // Случайное положение
      element.style.left = `${Math.random() * 100}%`
      element.style.top = `${Math.random() * 100}%`

      // Применяем стили в зависимости от типа
      switch (type) {
        case 'circle':
          element.style.borderRadius = '50%'
          element.style.background = `radial-gradient(circle, ${color}10, ${color}02)`
          element.style.filter = `blur(${20 + Math.random() * 15}px)`
          break
        case 'blob':
          const radius = [
            30 + Math.random() * 40,
            50 + Math.random() * 40,
            30 + Math.random() * 20,
            60 + Math.random() * 20,
          ]
          element.style.borderRadius = `${radius[0]}% ${radius[1]}% ${radius[2]}% ${radius[3]}%`
          element.style.background = `linear-gradient(45deg, ${color}15, ${color}05)`
          element.style.filter = `blur(${25 + Math.random() * 15}px)`
          break
        case 'square':
          element.style.borderRadius = `${15 + Math.random() * 20}px`
          element.style.background = `linear-gradient(135deg, ${color}10, ${color}03)`
          element.style.filter = `blur(${20 + Math.random() * 15}px)`
          break
      }

      // Добавляем в контейнер и массив для анимации
      container.appendChild(element)
      particles.push(element)
    }

    // Анимируем появление элементов
    gsap.to(particles, {
      opacity: 0.6,
      stagger: {
        amount: 1,
        from: 'random',
      },
      duration: 1.5,
      ease: 'power2.out',
    })

    // Анимируем движение элементов
    particles.forEach(particle => {
      // Создаем случайные параметры движения
      const xMove = Math.random() * 80 - 40
      const yMove = Math.random() * 80 - 40
      const duration = 20 + Math.random() * 40

      // Плавное движение
      gsap.to(particle, {
        x: xMove,
        y: yMove,
        duration,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    })

    // Плавные переходы между страницами
    if (pageWrapperRef.current) {
      // Анимация выхода при изменении маршрута
      const exitAnimation = () => {
        gsap.to(pageWrapperRef.current, {
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: 'power2.inOut',
        })
      }

      // Анимация входа при загрузке
      const enterAnimation = () => {
        gsap.fromTo(
          pageWrapperRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            delay: 0.1,
          },
        )
      }

      // Запускаем входную анимацию
      enterAnimation()
    }

    return () => {
      // Очистка анимаций при размонтировании
      gsap.killTweensOf(particles)
    }
  }, [pathname])

  // Анимация текстовых элементов при скролле
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Находим все элементы с специальными классами для анимации
    const fadeElements = document.querySelectorAll('.fade-in-element')
    const scaleElements = document.querySelectorAll('.scale-in-element')
    const slideElements = document.querySelectorAll('.slide-in-element')

    // Анимация для плавного появления
    fadeElements.forEach(element => {
      gsap.fromTo(
        element,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        },
      )
    })

    // Анимация для увеличения
    scaleElements.forEach(element => {
      gsap.fromTo(
        element,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: 'back.out(1.5)',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        },
      )
    })

    // Анимация для появления сбоку
    slideElements.forEach(element => {
      const direction = element.classList.contains('slide-from-right') ? 50 : -50

      gsap.fromTo(
        element,
        { opacity: 0, x: direction },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        },
      )
    })

    return () => {
      // Очищаем все ScrollTrigger
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [pathname])

  // Стили для фоновых элементов и анимированных компонентов
  const styles = `
    .bg-particle {
      position: absolute;
      pointer-events: none;
      opacity: 0;
      will-change: transform, opacity;
    }

    /* Глассморфизм */
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    }

    /* Градиентные текстовые эффекты */
    .gradient-text {
      background: linear-gradient(to right, #4f46e5, #8b5cf6, #3b82f6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    /* Брутализм */
    .brutalist {
      background: #ffffff;
      border: 3px solid #000000;
      box-shadow: 8px 8px 0 #000000;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .brutalist:hover {
      transform: translate(-4px, -4px);
      box-shadow: 12px 12px 0 #000000;
    }

    /* Классы для анимаций при скролле */
    .fade-in-element, .scale-in-element, .slide-in-element {
      visibility: visible;
    }
  `

  return (
    <html lang="en" className={`${inter.variable} ${raleway.variable} dark`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body className="font-sans antialiased bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        {/* Фоновые элементы */}
        <div ref={backgroundRef} className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]"></div>

        {/* Контейнер содержимого с анимацией страницы */}
        <div ref={pageWrapperRef} className="min-h-screen w-full">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  )
}
