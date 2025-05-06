'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Icon } from '@iconify/react'

// Регистрируем плагины GSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Компонент кнопки с магнитным эффектом
const MagneticButton = ({ children, href, className }) => {
  const buttonRef = useRef(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseMove = e => {
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      const distance = Math.sqrt(x * x + y * y)
      const maxDistance = Math.max(rect.width, rect.height) * 1.5

      if (distance < maxDistance) {
        const intensity = 1 - Math.min(distance / maxDistance, 1)
        gsap.to(button, {
          x: x * intensity * 0.3,
          y: y * intensity * 0.3,
          scale: 1 + intensity * 0.1,
          duration: 0.3,
          ease: 'power2.out',
        })
      }
    }

    const handleMouseLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.4,
        ease: 'elastic.out(1, 0.5)',
      })
    }

    button.addEventListener('mousemove', handleMouseMove)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mousemove', handleMouseMove)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <Link href={href || '#'} ref={buttonRef} className={className}>
      {children}
    </Link>
  )
}

// Компонент анимированной карточки
const AnimatedCard = ({ icon, title, description, features, index }) => {
  const cardRef = useRef(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    // Эффект наведения
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        y: -10,
        boxShadow: '0 20px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(79, 70, 229, 0.3)',
        duration: 0.3,
      })
    })

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        duration: 0.4,
        ease: 'power1.out',
      })
    })

    // Анимация при скролле
    ScrollTrigger.create({
      trigger: card,
      start: 'top bottom-=100',
      onEnter: () => {
        gsap.fromTo(
          card,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: index * 0.1 },
        )
      },
      once: true,
    })
  }, [index])

  return (
    <div
      ref={cardRef}
      className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/30 transition-all duration-300 shadow-lg">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
        <Icon icon={icon} className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-300 mb-6">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <Icon icon="carbon:checkmark-filled" className="h-5 w-5 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Главный компонент
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef(null)
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const statsRef = useRef(null)
  const ctaRef = useRef(null)
  const backgroundRef = useRef(null)

  // Функция прокрутки к разделу
  const scrollToSection = ref => {
    if (ref.current) {
      window.scrollTo({
        top: ref.current.offsetTop - 80,
        behavior: 'smooth',
      })
      setMenuOpen(false)
    }
  }

  // Анимация элементов
  useEffect(() => {
    // Анимация заголовка
    gsap.fromTo('.hero-title', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: 'elastic.out(1, 0.5)' })

    gsap.fromTo(
      '.hero-description',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power2.out' },
    )

    gsap.fromTo(
      '.hero-button',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, delay: 0.5, stagger: 0.15, ease: 'back.out(1.7)' },
    )

    // Фиксированная шапка при скролле
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: 'bottom 80px',
      onEnter: () => headerRef.current?.classList.add('header-scrolled'),
      onLeaveBack: () => headerRef.current?.classList.remove('header-scrolled'),
    })

    // Создание фоновых элементов
    const createBackgroundElements = () => {
      if (!backgroundRef.current) return
      const bg = backgroundRef.current
      const count = 20

      // Очищаем контейнер
      while (bg.firstChild) {
        bg.removeChild(bg.firstChild)
      }

      for (let i = 0; i < count; i++) {
        const size = 20 + Math.random() * 300
        const element = document.createElement('div')

        // Стили элемента
        element.classList.add('bg-element')
        element.style.position = 'absolute'
        element.style.width = `${size}px`
        element.style.height = `${size}px`
        element.style.left = `${Math.random() * 100}%`
        element.style.top = `${Math.random() * 100}%`
        element.style.opacity = '0'
        element.style.zIndex = '-1'

        // Случайная форма
        const shapes = ['circle', 'blob', 'square']
        const shape = shapes[Math.floor(Math.random() * shapes.length)]

        if (shape === 'circle') {
          element.style.borderRadius = '50%'
          element.style.background = `linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(59, 130, 246, 0.05))`
        } else if (shape === 'square') {
          element.style.borderRadius = '15%'
          element.style.background = `linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(79, 70, 229, 0.05))`
        } else {
          // Случайная blob-форма
          const radius = [
            30 + Math.random() * 40,
            50 + Math.random() * 40,
            30 + Math.random() * 20,
            60 + Math.random() * 20,
          ]
          element.style.borderRadius = `${radius[0]}% ${radius[1]}% ${radius[2]}% ${radius[3]}%`
          element.style.background = `linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(79, 70, 229, 0.05))`
        }

        // Добавляем размытие
        element.style.filter = `blur(${30 + Math.random() * 50}px)`

        // Добавляем в DOM
        bg.appendChild(element)

        // Анимируем появление
        gsap.to(element, {
          opacity: 0.5 + Math.random() * 0.3,
          duration: 1 + Math.random(),
          ease: 'power2.out',
          delay: Math.random() * 1,
        })

        // Анимируем движение
        gsap.to(element, {
          x: -50 + Math.random() * 100,
          y: -50 + Math.random() * 100,
          rotation: -15 + Math.random() * 30,
          duration: 30 + Math.random() * 30,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
    }

    createBackgroundElements()

    // Анимация статистики при скролле
    const animateNumbers = () => {
      const numbers = document.querySelectorAll('.animate-number')
      numbers.forEach(number => {
        const target = parseInt(number.getAttribute('data-target') || '0')

        ScrollTrigger.create({
          trigger: number,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            let startValue = 0
            const duration = 2
            const increment = target / (duration * 60) // 60fps

            const updateNumber = () => {
              startValue += increment
              if (startValue >= target) {
                number.textContent = target
                return
              }
              number.textContent = Math.floor(startValue)
              requestAnimationFrame(updateNumber)
            }

            requestAnimationFrame(updateNumber)
          },
        })
      })
    }

    animateNumbers()

    // Анимация прогресса
    const animateProgress = () => {
      const bars = document.querySelectorAll('.progress-bar')

      bars.forEach(bar => {
        const percentage = bar.getAttribute('data-percentage') || '0'

        ScrollTrigger.create({
          trigger: bar,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.to(bar, {
              width: percentage,
              duration: 1.5,
              ease: 'power3.out',
            })
          },
        })
      })
    }

    animateProgress()

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* Фоновые элементы */}
      <div ref={backgroundRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0"></div>

      {/* Градиентный фон */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/5 to-gray-950 z-[-1]"></div>

      {/* Шапка */}
      <header ref={headerRef} className="fixed top-0 w-full z-50 transition-all duration-500 py-4 px-6 md:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-indigo-500 rounded-full opacity-20 blur-lg"></div>
              <Icon icon="bx:cube" className="h-8 w-8 text-indigo-400 relative" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
              SupplyMaster
            </span>
          </div>

          {/* Навигация для десктопа */}
          <nav className="hidden md:flex gap-8">
            {[
              ['Главная', heroRef],
              ['Возможности', featuresRef],
              ['Статистика', statsRef],
              ['Начать', ctaRef],
            ].map(([label, ref], index) => (
              <button
                key={index}
                onClick={() => scrollToSection(ref)}
                className="text-gray-300 hover:text-white transition-all font-medium relative group">
                {label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover:w-full"></span>
              </button>
            ))}
          </nav>

          {/* Кнопка авторизации для десктопа */}
          <div className="hidden md:block">
            <MagneticButton
              href="/auth/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-500/30">
              <span>Войти в систему</span>
              <Icon icon="heroicons:arrow-right" className="h-4 w-4" />
            </MagneticButton>
          </div>

          {/* Кнопка меню для мобильных */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-200 hover:text-white relative w-10 h-10 flex items-center justify-center">
            <div
              className={`w-6 h-0.5 bg-current absolute transition-all duration-300 ${
                menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
              }`}></div>
            <div
              className={`w-6 h-0.5 bg-current absolute transition-all duration-300 ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}></div>
            <div
              className={`w-6 h-0.5 bg-current absolute transition-all duration-300 ${
                menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
              }`}></div>
          </button>
        </div>

        {/* Мобильное меню */}
        {menuOpen && (
          <div className="absolute top-full left-0 w-full bg-gray-800/90 backdrop-blur-xl shadow-lg py-6 px-6 space-y-4 md:hidden">
            {[
              ['Главная', heroRef],
              ['Возможности', featuresRef],
              ['Статистика', statsRef],
              ['Начать', ctaRef],
            ].map(([label, ref], index) => (
              <button
                key={index}
                onClick={() => scrollToSection(ref)}
                className="block w-full text-left text-gray-300 hover:text-white transition-colors py-3">
                {label}
              </button>
            ))}
            <div>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-5 rounded-lg font-medium">
                Войти в систему
                <Icon icon="heroicons:arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Герой секция */}
      <section ref={heroRef} className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 md:px-10 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="block">Революционное</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
                управление поставщиками
              </span>
            </h1>
            <p className="hero-description text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
              Автоматизируйте процессы, оптимизируйте цепочки поставок и управляйте отношениями с поставщиками на новом
              уровне с помощью интеллектуальной платформы.
            </p>
            <div className="flex flex-wrap gap-4">
              <MagneticButton
                href="/auth/register"
                className="hero-button inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white py-3 px-8 rounded-lg font-medium transition-all hover:shadow-[0_5px_15px_rgba(79,70,229,0.4)] relative overflow-hidden">
                <span className="relative z-10">Попробовать бесплатно</span>
                <Icon icon="heroicons:bolt" className="h-5 w-5 relative z-10" />
                <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[-100%] animate-shine"></div>
              </MagneticButton>

              <MagneticButton
                href="/auth/login"
                className="hero-button inline-flex items-center gap-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 border border-gray-700 text-white py-3 px-8 rounded-lg font-medium transition-all hover:shadow-lg">
                <span>Демо-версия</span>
                <Icon icon="heroicons:arrow-right" className="h-5 w-5" />
              </MagneticButton>
            </div>

            {/* Социальное доказательство */}
            <div className="mt-10">
              <div className="p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {['blue', 'indigo', 'purple', 'gray'].map((color, i) => (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-full bg-${color}-600 border-2 border-gray-800 flex items-center justify-center text-sm font-bold`}>
                        {['ИВ', 'АП', 'СК', '+120'][i]}
                      </div>
                    ))}
                  </div>
                  <div className="text-gray-300 text-sm">
                    <span className="font-semibold text-white">130+ компаний</span> уже оптимизировали свои цепочки
                    поставок
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Анимированная 3D сетка */}
          <div className="h-[400px] md:h-[500px] relative perspective-1000">
            <div className="absolute w-full h-full">
              {/* Центральный элемент */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40">
                <div className="animate-pulse absolute -inset-4 bg-indigo-600/20 rounded-full blur-2xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/30 to-blue-600/30 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.5)]">
                  <Icon icon="heroicons:cube-transparent" className="h-16 w-16 text-indigo-200" />
                </div>
              </div>

              {/* Плавающие элементы */}
              {[...Array(6)].map((_, i) => {
                const positions = [
                  { top: '10%', left: '20%' },
                  { top: '25%', left: '65%' },
                  { top: '65%', left: '25%' },
                  { top: '75%', left: '70%' },
                  { top: '15%', left: '80%' },
                  { top: '40%', left: '15%' },
                ]
                const icons = [
                  'heroicons:building-office-2',
                  'heroicons:clipboard-document-check',
                  'heroicons:chart-bar',
                  'heroicons:globe-europe-africa',
                  'heroicons:cog-6-tooth',
                  'heroicons:clock',
                ]

                return (
                  <div
                    key={i}
                    className="supplier-element absolute"
                    style={{
                      top: positions[i].top,
                      left: positions[i].left,
                      animation: `float ${8 + i * 2}s infinite alternate ease-in-out ${i}s`,
                    }}>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-800/40 to-blue-700/40 backdrop-blur-lg rounded-xl shadow-xl border border-indigo-500/20 flex items-center justify-center">
                      <Icon icon={icons[i]} className="h-8 w-8 text-indigo-300" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Секция возможностей */}
      <section ref={featuresRef} className="py-20 px-6 md:px-10 bg-gray-900/60 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Комплексное решение для управления</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Наша платформа объединяет все инструменты для эффективного управления поставщиками
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            {
              icon: 'carbon:user-multiple',
              title: 'Управление поставщиками',
              description:
                'Централизованная база поставщиков с полной историей взаимодействия, документами и контактами.',
              features: ['Сегментация поставщиков', 'Отчеты по эффективности', 'Система рейтингов и отзывов'],
            },
            {
              icon: 'carbon:chart-bar',
              title: 'Аналитика и прогнозирование',
              description: 'Продвинутые инструменты аналитики для оптимизации поставок и прогнозирования спроса.',
              features: ['Прогнозирование спроса', 'Анализ рисков поставщиков', 'Оптимизация запасов'],
            },
            {
              icon: 'carbon:building',
              title: 'Автоматизация процессов',
              description:
                'Автоматизируйте повторяющиеся задачи, оповещения и формирование отчетов для экономии времени.',
              features: ['Автоматические закупки', 'Периодические отчеты', 'Умные оповещения'],
            },
            {
              icon: 'carbon:security',
              title: 'Управление рисками',
              description: 'Выявление и снижение рисков в цепочке поставок для обеспечения непрерывности бизнеса.',
              features: ['Мониторинг соответствия', 'Оценка финансовой стабильности', 'Контроль страны происхождения'],
            },
            {
              icon: 'carbon:growth',
              title: 'Оптимизация затрат',
              description: 'Снижение издержек благодаря анализу затрат и переговорам с поставщиками на основе данных.',
              features: ['Анализ затрат на закупки', 'Выявление экономии', 'Сравнение предложений'],
            },
            {
              icon: 'carbon:warning-alt',
              title: 'Соответствие требованиям',
              description: 'Обеспечение соответствия нормативным требованиям и стандартам в работе с поставщиками.',
              features: ['Управление сертификатами', 'Аудит поставщиков', 'Управление документацией'],
            },
          ].map((card, index) => (
            <AnimatedCard key={index} {...card} index={index} />
          ))}
        </div>
      </section>

      {/* Секция статистики */}
      <section ref={statsRef} className="py-20 px-6 md:px-10 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Проверенное решение для вашего бизнеса</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Тысячи компаний уже оптимизировали свои процессы закупок с SupplyMaster
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: 'heroicons:building-office', value: '130', label: 'Клиентов' },
              { icon: 'heroicons:user-group', value: '1500', label: 'Поставщиков' },
              { icon: 'heroicons:document-check', value: '25000', label: 'Контрактов' },
              { icon: 'heroicons:currency-dollar', value: '12', label: 'Млн экономии' },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 backdrop-blur-md rounded-xl p-6 text-center border border-gray-700/50 transform hover:-translate-y-2 transition-all duration-300 shadow-lg">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-900/50 flex items-center justify-center">
                    <Icon icon={stat.icon} className="h-7 w-7 text-indigo-400" />
                  </div>
                </div>
                <div
                  className="animate-number text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-500"
                  data-target={stat.value}>
                  0
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Показатели эффективности */}
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-gray-700/50 shadow-lg">
              <h3 className="text-xl font-bold mb-4">Эффективность внедрения</h3>
              <div className="space-y-4">
                {[
                  { label: 'Сокращение затрат', value: '90%' },
                  { label: 'Ускорение процессов', value: '75%' },
                  { label: 'Снижение рисков', value: '85%' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">{item.label}</span>
                      <span className="text-gray-300">{item.value}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="progress-bar h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500"
                        data-percentage={item.value}
                        style={{ width: '0%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-gray-700/50 shadow-lg">
              <h3 className="text-xl font-bold mb-4">Отзывы клиентов</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold mr-3">
                      АК
                    </div>
                    <div>
                      <div className="font-medium">Александр К.</div>
                      <div className="text-gray-400 text-sm">Директор по закупкам</div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">
                    SupplyMaster помог нам сократить расходы на закупки на 30% в первый год использования.
                  </p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center font-bold mr-3">
                      ЕМ
                    </div>
                    <div>
                      <div className="font-medium">Елена М.</div>
                      <div className="text-gray-400 text-sm">Руководитель отдела снабжения</div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Автоматизация процессов позволила нам высвободить 40% рабочего времени специалистов.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA секция */}
      <section ref={ctaRef} className="py-20 px-6 md:px-10 bg-gray-900/60 backdrop-blur-sm relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-2">
            <span className="px-4 py-1.5 rounded-full bg-indigo-900/60 text-indigo-300 text-sm font-medium border border-indigo-700/50">
              Начните сегодня
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Готовы оптимизировать управление поставщиками?</h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Присоединяйтесь к сотням компаний, которые уже оптимизировали свои процессы закупок и управления
            поставщиками с SupplyMaster.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <MagneticButton
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white py-3 px-8 rounded-lg font-medium transition-all hover:shadow-[0_5px_15px_rgba(79,70,229,0.4)] relative overflow-hidden">
              <span className="relative z-10">Начать бесплатно</span>
              <Icon icon="heroicons:bolt" className="h-5 w-5 relative z-10" />
              <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[-100%] animate-shine"></div>
            </MagneticButton>

            <MagneticButton
              href="/contact"
              className="inline-flex items-center gap-2 bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/60 border border-gray-700 text-white py-3 px-8 rounded-lg font-medium transition-all hover:shadow-lg">
              <span>Запросить демо</span>
              <Icon icon="heroicons:arrow-right" className="h-5 w-5" />
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* Футер с анимированным градиентом */}
      <footer className="bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/10 to-blue-900/10"></div>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="bx:cube" className="h-6 w-6 text-indigo-400" />
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                  SupplyMaster
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Комплексное решение для управления поставщиками и оптимизации процессов закупок.
              </p>
              <div className="flex gap-4">
                {['ri:twitter-fill', 'ri:facebook-fill', 'ri:linkedin-fill', 'ri:instagram-fill'].map((icon, i) => (
                  <a key={i} href="#" className="text-gray-400 hover:text-indigo-400 transition-colors">
                    <Icon icon={icon} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: 'Продукт', links: ['Функции', 'Цены', 'Обновления', 'FAQ'] },
              { title: 'Компания', links: ['О нас', 'Блог', 'Клиенты', 'Карьера'] },
              { title: 'Ресурсы', links: ['Документация', 'Обучение', 'Вебинары', 'Поддержка'] },
            ].map((col, i) => (
              <div key={i}>
                <h3 className="font-bold mb-4">{col.title}</h3>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© 2025 SupplyMaster. Все права защищены.</p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm">
                Условия использования
              </a>
              <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm">
                Политика конфиденциальности
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Глобальные стили */}
      <style jsx global>{`
        /* Анимации для фоновых элементов */
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0);
          }
          100% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        /* Анимация блеска для кнопок */
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Стили для прокрученной шапки */
        .header-scrolled {
          background-color: rgba(17, 24, 39, 0.8);
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
