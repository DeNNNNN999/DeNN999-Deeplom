'use client'

import './globals.css'
import { Inter, Raleway } from 'next/font/google'
import { Providers } from './providers'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'

// Импорт GSAP для анимаций
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Регистрация плагинов GSAP на стороне клиента
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Шрифты для всего приложения
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap'
})

const raleway = Raleway({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
})

// ВАЖНО: metadata не может быть экспортирована из клиентского компонента
// Метаданные определены в отдельном файле metadata.ts

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const decorativeElementsRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorDotRef = useRef<HTMLDivElement>(null)
  const [cursorText, setCursorText] = useState('')
  const [cursorVariant, setCursorVariant] = useState('default')
  const [isMobile, setIsMobile] = useState(false)

  // Проверка, является ли устройство мобильным
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Эффект для кастомного курсора (только для десктопа)
  useEffect(() => {
    if (isMobile) return // Не используем кастомный курсор на мобильных

    const cursor = cursorRef.current
    const cursorDot = cursorDotRef.current
    if (!cursor || !cursorDot) return

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: 'power2.out'
      })
      
      gsap.to(cursorDot, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
      })
    }
    
    // Обработчики для ховера над интерактивными элементами
    const onMouseEnterInteractive = () => {
      setCursorVariant('interactive')
    }
    
    const onMouseLeaveInteractive = () => {
      setCursorVariant('default')
    }
    
    // Ховер над кнопками
    const onMouseEnterButton = () => {
      setCursorVariant('button')
      setCursorText('Click')
    }
    
    const onMouseLeaveButton = () => {
      setCursorVariant('default')
      setCursorText('')
    }
    
    document.addEventListener('mousemove', onMouseMove)
    
    // Добавляем обработчики для всех интерактивных элементов
    const setupInteractiveElements = () => {
      const interactiveElements = document.querySelectorAll('a, button, input, select, [role="button"]')
      interactiveElements.forEach(element => {
        if (element.tagName.toLowerCase() === 'button' || 
            (element.tagName.toLowerCase() === 'a' && element.hasAttribute('href'))) {
          element.addEventListener('mouseenter', onMouseEnterButton)
          element.addEventListener('mouseleave', onMouseLeaveButton)
        } else {
          element.addEventListener('mouseenter', onMouseEnterInteractive)
          element.addEventListener('mouseleave', onMouseLeaveInteractive)
        }
      })
    }
    
    // Вызываем сразу и после изменения DOM
    setupInteractiveElements()
    const observer = new MutationObserver(setupInteractiveElements)
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      observer.disconnect()
      const interactiveElements = document.querySelectorAll('a, button, input, select, [role="button"]')
      interactiveElements.forEach(element => {
        element.removeEventListener('mouseenter', onMouseEnterButton)
        element.removeEventListener('mouseleave', onMouseLeaveButton)
        element.removeEventListener('mouseenter', onMouseEnterInteractive)
        element.removeEventListener('mouseleave', onMouseLeaveInteractive)
      })
    }
  }, [isMobile, pathname])

  // Декоративные элементы фона
  useEffect(() => {
    if (!decorativeElementsRef.current) return

    // Создаем декоративные элементы для фона
    const createDecorative = () => {
      const container = decorativeElementsRef.current
      if (!container) return

      // Очищаем контейнер перед добавлением новых элементов
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }

      // Создаем разные фигуры
      const shapes = [
        { type: 'circle', count: 5 },
        { type: 'square', count: 3 },
        { type: 'triangle', count: 4 },
        { type: 'hexagon', count: 2 }
      ]

      shapes.forEach(shape => {
        for (let i = 0; i < shape.count; i++) {
          const element = document.createElement('div')
          element.classList.add('decorative-shape', `shape-${shape.type}`)
          
          // Случайное положение
          element.style.left = `${Math.random() * 100}%`
          element.style.top = `${Math.random() * 100}%`
          
          // Случайный размер
          const size = 50 + Math.random() * 100
          element.style.width = `${size}px`
          element.style.height = `${size}px`
          
          // Добавляем градиентный цвет
          const hue1 = Math.floor(Math.random() * 60) + 210 // Оттенки синего/фиолетового
          const hue2 = Math.floor(Math.random() * 60) + 180 // Оттенки сине-зеленого
          
          if (shape.type === 'circle') {
            element.style.borderRadius = '50%'
            element.style.background = `radial-gradient(circle, hsla(${hue1}, 80%, 60%, 0.15), hsla(${hue2}, 70%, 40%, 0.05))`
          } else if (shape.type === 'square') {
            element.style.borderRadius = '10%'
            element.style.background = `linear-gradient(45deg, hsla(${hue1}, 70%, 50%, 0.15), hsla(${hue2}, 60%, 40%, 0.05))`
          } else if (shape.type === 'triangle') {
            element.style.width = '0'
            element.style.height = '0'
            element.style.borderLeft = `${size/2}px solid transparent`
            element.style.borderRight = `${size/2}px solid transparent`
            element.style.borderBottom = `${size}px solid hsla(${hue1}, 70%, 50%, 0.1)`
            element.style.background = 'transparent'
          } else if (shape.type === 'hexagon') {
            element.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            element.style.background = `conic-gradient(from 45deg, hsla(${hue1}, 80%, 60%, 0.15), hsla(${hue2}, 70%, 40%, 0.05))`
          }
          
          // Добавляем блюр
          element.style.filter = `blur(${10 + Math.random() * 10}px)`
          
          // Добавляем элемент в контейнер
          container.appendChild(element)
        }
      })
    }

    createDecorative()

    // Анимируем декоративные элементы
    const animateDecorative = () => {
      const shapes = document.querySelectorAll('.decorative-shape')
      
      // Начальная анимация появления
      gsap.fromTo(
        shapes, 
        { 
          opacity: 0, 
          scale: 0.5, 
          y: 40 
        }, 
        { 
          opacity: 0.8, 
          scale: 1, 
          y: 0, 
          stagger: 0.1,
          duration: 1.5,
          ease: 'elastic.out(1, 0.5)' 
        }
      )
      
      // Анимируем каждую фигуру отдельно для создания плавающего эффекта
      shapes.forEach((shape, index) => {
        // Создаем случайные параметры движения
        const randomX = Math.random() * 80 - 40 // От -40 до 40
        const randomY = Math.random() * 80 - 40 // От -40 до 40
        const randomRotation = Math.random() * 360 // От 0 до 360
        const randomDuration = 15 + Math.random() * 20 // От 15 до 35 секунд
        
        gsap.to(shape, {
          x: randomX,
          y: randomY,
          rotation: randomRotation,
          duration: randomDuration,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.2
        })
      })
    }

    // Запускаем анимацию с небольшой задержкой
    setTimeout(animateDecorative, 500)

    // Очистка
    return () => {
      const shapes = document.querySelectorAll('.decorative-shape')
      shapes.forEach(shape => {
        gsap.killTweensOf(shape)
      })
    }
  }, [pathname])

  // Варианты анимации для курсора
  const cursorVariants = {
    default: {
      width: 40,
      height: 40,
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      border: '1px solid rgba(79, 70, 229, 0.2)',
      x: -20,
      y: -20,
    },
    interactive: {
      width: 60,
      height: 60,
      backgroundColor: 'rgba(79, 70, 229, 0.15)',
      border: '1.5px solid rgba(79, 70, 229, 0.6)',
      x: -30,
      y: -30,
    },
    button: {
      width: 80,
      height: 80,
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      border: '2px solid rgba(79, 70, 229, 0.8)',
      x: -40,
      y: -40,
    }
  }

  // Стили для декоративных элементов и курсора
  const decorativeStyles = `
    .decorative-shape {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      z-index: -1;
      opacity: 0.2;
      will-change: transform;
    }
    
    .auth-background {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -1;
    }
    
    .page-transition-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .cursor-dot {
      position: fixed;
      top: 0;
      left: 0;
      width: 8px;
      height: 8px;
      background-color: rgba(79, 70, 229, 0.9);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
    }

    .cursor {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      mix-blend-mode: difference;
      backdrop-filter: blur(1px);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-weight: 500;
      font-size: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    @media (max-width: 768px) {
      .cursor, .cursor-dot {
        display: none;
      }
    }

    .gradient-text {
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      background-image: linear-gradient(90deg, #4f46e5, #8b5cf6, #3b82f6);
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .brutalist-element {
      border: 2px solid #000;
      box-shadow: 6px 6px 0 #000;
      transition: box-shadow 0.3s, transform 0.3s;
    }

    .brutalist-element:hover {
      box-shadow: 10px 10px 0 #000;
      transform: translate(-4px, -4px);
    }

    .radial-gradient-bg {
      background: radial-gradient(circle at center, rgba(79, 70, 229, 0.15) 0%, rgba(17, 24, 39, 0) 70%);
    }

    .glass-blur {
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
  `

  return (
    <html lang="en" className={`${inter.variable} ${raleway.variable} dark`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: decorativeStyles }} />
      </head>
      <body className="font-sans antialiased overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        {/* Декоративные элементы фона */}
        <div ref={decorativeElementsRef} className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]"></div>
        
        {/* Кастомный курсор (только на десктопах) */}
        {!isMobile && (
          <>
            <motion.div 
              ref={cursorRef}
              className="cursor hidden md:flex"
              variants={cursorVariants}
              animate={cursorVariant}
              transition={{ type: "tween", ease: "backOut", duration: 0.3 }}
            >
              {cursorText && <span>{cursorText}</span>}
            </motion.div>
            <div ref={cursorDotRef} className="cursor-dot hidden md:block"></div>
          </>
        )}

        {/* Провайдеры приложения */}
        <Providers>
          {/* Анимация перехода страниц */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="page-transition-wrapper"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </Providers>
      </body>
    </html>
  )
}
