import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Регистрируем плагин
gsap.registerPlugin(ScrollTrigger);

/**
 * Направления для параллакса
 */
export type ParallaxDirection = 'vertical' | 'horizontal' | 'both';

/**
 * Интерфейс опций для хука useGsapParallax
 */
export interface UseGsapParallaxOptions {
  /**
   * Ref на элемент или селектор
   */
  target: React.RefObject<Element> | string;
  
  /**
   * Ref на контейнер или селектор (обычно родительский элемент)
   */
  container?: React.RefObject<Element> | string;
  
  /**
   * Сила параллакса, больше значение = больше эффект
   * @default 0.5
   */
  strength?: number;
  
  /**
   * Направление параллакса
   * @default "vertical"
   */
  direction?: ParallaxDirection;
  
  /**
   * Начальное и конечное положение триггера скролла
   * @default "top bottom"
   */
  start?: string;
  
  /**
   * Конечное положение триггера скролла
   * @default "bottom top"
   */
  end?: string;
  
  /**
   * Плавное привязывание к скроллу
   * @default true
   */
  scrub?: boolean | number;
  
  /**
   * Сглаживание эффекта
   * @default 1
   */
  smoothness?: number;
  
  /**
   * Показать маркеры для отладки
   * @default false
   */
  markers?: boolean;
  
  /**
   * Привязать анимацию к скроллу сверху страницы (для fullscreen эффектов)
   * @default false
   */
  pin?: boolean;
  
  /**
   * Дополнительные настройки ScrollTrigger
   */
  scrollTriggerOptions?: Partial<ScrollTrigger.Vars>;
  
  /**
   * Включить отзывчивость на устройство
   * @default true
   */
  responsive?: boolean;
  
  /**
   * Дополнительные настройки анимации
   */
  animationOptions?: gsap.TweenVars;
  
  /**
   * Зависимости для пересоздания
   */
  dependencies?: any[];
}

/**
 * Хук для создания эффектов параллакса с помощью GSAP
 * 
 * @example
 * ```tsx
 * // Простой вертикальный параллакс
 * const { scrollTrigger } = useGsapParallax({
 *   target: backgroundRef,
 *   strength: 0.3
 * });
 * 
 * // Горизонтальный параллакс с пользовательскими настройками
 * const { scrollTrigger, animation } = useGsapParallax({
 *   target: elementsRef,
 *   container: sectionRef,
 *   direction: 'horizontal',
 *   strength: 0.5,
 *   scrub: 0.5,
 *   start: 'top bottom',
 *   end: 'bottom top'
 * });
 * 
 * // Многонаправленный параллакс
 * const { scrollTrigger } = useGsapParallax({
 *   target: imageRef,
 *   direction: 'both',
 *   strength: {
 *     x: 0.3,
 *     y: 0.5
 *   }
 * });
 * ```
 */
export const useGsapParallax = (options: UseGsapParallaxOptions) => {
  const {
    target,
    container,
    strength = 0.5,
    direction = 'vertical',
    start = 'top bottom',
    end = 'bottom top',
    scrub = true,
    smoothness = 1,
    markers = false,
    pin = false,
    scrollTriggerOptions = {},
    responsive = true,
    animationOptions = {},
    dependencies = []
  } = options;
  
  // Хранение экземпляров
  const scrollTriggerRef = useRef<ScrollTrigger>();
  const animationRef = useRef<gsap.core.Tween>();
  
  useEffect(() => {
    // Получаем элементы (строкой или рефом)
    const targetElement = typeof target === 'string'
      ? document.querySelector(target)
      : target.current;
    
    const containerElement = container
      ? (typeof container === 'string'
        ? document.querySelector(container)
        : container.current)
      : null;
    
    // Проверяем наличие целевого элемента
    if (!targetElement) return;
    
    // Определяем триггер для ScrollTrigger
    const triggerElement = containerElement || targetElement.parentElement || targetElement;
    
    // Создаем настройки для ScrollTrigger
    const scrollTriggerConfig: ScrollTrigger.Vars = {
      trigger: triggerElement,
      start,
      end,
      scrub: scrub === true ? smoothness : scrub,
      markers,
      pin: pin ? triggerElement : false,
      ...scrollTriggerOptions
    };
    
    // Настройки для анимации параллакса
    const animConfig: gsap.TweenVars = {
      ease: 'none',
      ...animationOptions
    };
    
    // Определяем значения для параллакса
    if (direction === 'vertical' || direction === 'both') {
      const yStrength = typeof strength === 'object' ? strength.y || 0.5 : strength;
      const yDistance = 100 * yStrength;
      animConfig.y = responsive
        ? `clamp(${-yDistance}px, ${-yDistance}vh, ${-yDistance}px)`
        : -yDistance;
    }
    
    if (direction === 'horizontal' || direction === 'both') {
      const xStrength = typeof strength === 'object' ? strength.x || 0.5 : strength;
      const xDistance = 100 * xStrength;
      animConfig.x = responsive
        ? `clamp(${-xDistance}px, ${-xDistance}vw, ${-xDistance}px)`
        : -xDistance;
    }
    
    // Добавляем ScrollTrigger в конфигурацию анимации
    animConfig.scrollTrigger = scrollTriggerConfig;
    
    // Создаем анимацию
    const tween = gsap.to(targetElement, animConfig);
    
    // Сохраняем ссылки на созданные экземпляры
    animationRef.current = tween;
    scrollTriggerRef.current = ScrollTrigger.getById(tween.scrollTrigger?.toString() || '') || undefined;
    
    // Очистка при размонтировании
    return () => {
      tween.kill();
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
    };
  }, [target, container, ...dependencies]);
  
  /**
   * Обновить ScrollTrigger
   */
  const refresh = () => {
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.refresh();
    }
  };
  
  /**
   * Убить ScrollTrigger
   */
  const kill = () => {
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.kill();
    }
    if (animationRef.current) {
      animationRef.current.kill();
    }
  };
  
  // Возвращаем ссылки на экземпляры и функции
  return {
    scrollTrigger: scrollTriggerRef.current,
    animation: animationRef.current,
    refresh,
    kill
  };
};
