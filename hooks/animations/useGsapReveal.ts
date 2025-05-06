import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Регистрируем плагин
gsap.registerPlugin(ScrollTrigger);

/**
 * Типы эффектов появления
 */
export type RevealEffect = 
  | 'fade' 
  | 'slideUp' 
  | 'slideDown' 
  | 'slideLeft' 
  | 'slideRight' 
  | 'clipRight'
  | 'clipLeft'
  | 'clipUp'
  | 'clipDown'
  | 'scale'
  | 'rotate'
  | 'custom';

/**
 * Направления появления
 */
export type RevealDirection = 'fromStart' | 'fromEnd' | 'fromCenter' | 'fromEdges' | 'random';

/**
 * Интерфейс настроек для маски обрезки
 */
export interface ClipSettings {
  /**
   * Изначальное положение маски
   * @default "0% 0% 100% 0%"
   */
  initial?: string;
  
  /**
   * Конечное положение маски
   * @default "0% 0% 100% 100%"
   */
  final?: string;
}

/**
 * Интерфейс опций для хука useGsapReveal
 */
export interface UseGsapRevealOptions {
  /**
   * Ref на элемент/элементы или селектор
   */
  targets: React.RefObject<Element | NodeList> | string | React.RefObject<Element>[];
  
  /**
   * Тип эффекта появления
   * @default "fade"
   */
  effect?: RevealEffect;
  
  /**
   * Пользовательская функция анимации
   */
  customEffect?: (
    elements: Element | Element[] | NodeList
  ) => gsap.core.Tween | gsap.core.Timeline;
  
  /**
   * Длительность анимации
   * @default 1
   */
  duration?: number;
  
  /**
   * Направление появления для множественных элементов
   * @default "fromStart"
   */
  direction?: RevealDirection;
  
  /**
   * Задержка между анимациями элементов
   * @default 0.1
   */
  stagger?: number | object;
  
  /**
   * Функция плавности
   * @default "power2.out"
   */
  ease?: string;
  
  /**
   * Расстояние перемещения для эффектов slide
   * @default 100
   */
  distance?: number;
  
  /**
   * Настройки для эффектов clip
   */
  clipSettings?: ClipSettings;
  
  /**
   * Использовать ли ScrollTrigger
   * @default true
   */
  useScrollTrigger?: boolean;
  
  /**
   * Настройки для ScrollTrigger
   */
  scrollTrigger?: Partial<ScrollTrigger.Vars>;
  
  /**
   * Запускать ли анимацию автоматически
   * @default true
   */
  autoStart?: boolean;
  
  /**
   * Коллбэк по завершении анимации
   */
  onComplete?: () => void;
  
  /**
   * Зависимости для пересоздания анимации
   */
  dependencies?: any[];
}

/**
 * Хук для создания эффектов появления элементов
 * 
 * @example
 * ```tsx
 * // Простое появление элемента
 * const { animation } = useGsapReveal({
 *   targets: cardRef,
 *   effect: 'slideUp',
 *   duration: 0.8
 * });
 * 
 * // Последовательное появление нескольких элементов
 * const { animation } = useGsapReveal({
 *   targets: '.card',
 *   effect: 'slideLeft',
 *   stagger: 0.2,
 *   scrollTrigger: {
 *     trigger: sectionRef.current,
 *     start: 'top bottom-=100'
 *   }
 * });
 * 
 * // Эффект обрезки с пользовательскими настройками
 * const { animation } = useGsapReveal({
 *   targets: headingRef,
 *   effect: 'clipRight',
 *   clipSettings: {
 *     initial: '0% 0% 0% 0%',
 *     final: '0% 0% 100% 100%'
 *   }
 * });
 * ```
 */
export const useGsapReveal = (options: UseGsapRevealOptions) => {
  const {
    targets,
    effect = 'fade',
    customEffect,
    duration = 1,
    direction = 'fromStart',
    stagger = 0.1,
    ease = 'power2.out',
    distance = 100,
    clipSettings,
    useScrollTrigger = true,
    scrollTrigger,
    autoStart = true,
    onComplete,
    dependencies = []
  } = options;
  
  // Хранение анимации
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline>();
  
  // Получаем элементы из targets
  const getElements = (): Element | Element[] | NodeList | null => {
    if (typeof targets === 'string') {
      // Если строка - используем как CSS селектор
      return document.querySelectorAll(targets);
    } else if (Array.isArray(targets)) {
      // Если массив рефов - извлекаем элементы
      return targets.map(ref => ref.current).filter(Boolean) as Element[];
    } else if (targets.current instanceof NodeList) {
      // Если NodeList
      return targets.current;
    } else {
      // Если одиночный элемент
      return targets.current;
    }
  };
  
  // Создаем и применяем анимацию
  useEffect(() => {
    const elements = getElements();
    
    // Проверяем наличие элементов
    if (!elements) return;
    
    let tween: gsap.core.Tween | gsap.core.Timeline;
    
    // Если есть пользовательская анимация, используем ее
    if (customEffect) {
      tween = customEffect(elements);
    } else {
      // Настройка стагера в зависимости от направления
      let staggerConfig = stagger;
      
      if (typeof stagger === 'number') {
        if (direction === 'fromEnd') {
          staggerConfig = { amount: stagger, from: 'end' };
        } else if (direction === 'fromCenter') {
          staggerConfig = { amount: stagger, from: 'center' };
        } else if (direction === 'fromEdges') {
          staggerConfig = { amount: stagger, from: 'edges' };
        } else if (direction === 'random') {
          staggerConfig = { amount: stagger, from: 'random' };
        }
      }
      
      // Базовые настройки анимации
      const animConfig: gsap.TweenVars = {
        duration,
        stagger: staggerConfig,
        ease,
        onComplete
      };
      
      // Если используем ScrollTrigger
      if (useScrollTrigger) {
        animConfig.scrollTrigger = {
          trigger: Array.isArray(elements) ? elements[0] : elements,
          start: 'top bottom-=100',
          toggleActions: 'play none none none',
          ...scrollTrigger
        };
      }
      
      // Настройки clip для эффектов обрезки
      const clipFrom = clipSettings?.initial || '0% 0% 100% 0%';
      const clipTo = clipSettings?.final || '0% 0% 100% 100%';
      
      // Применяем выбранный эффект
      switch (effect) {
        case 'fade':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0
          });
          break;
        case 'slideUp':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0,
            y: distance
          });
          break;
        case 'slideDown':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0,
            y: -distance
          });
          break;
        case 'slideLeft':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0,
            x: distance
          });
          break;
        case 'slideRight':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0,
            x: -distance
          });
          break;
        case 'clipRight':
          tween = gsap.fromTo(elements, 
            {
              clipPath: clipFrom
            },
            {
              ...animConfig,
              clipPath: clipTo
            }
          );
          break;
        case 'clipLeft':
          tween = gsap.fromTo(elements, 
            {
              clipPath: '100% 0% 100% 100%'
            },
            {
              ...animConfig,
              clipPath: '0% 0% 100% 100%'
            }
          );
          break;
        case 'clipUp':
          tween = gsap.fromTo(elements, 
            {
              clipPath: '0% 100% 100% 100%'
            },
            {
              ...animConfig,
              clipPath: '0% 0% 100% 100%'
            }
          );
          break;
        case 'clipDown':
          tween = gsap.fromTo(elements, 
            {
              clipPath: '0% 0% 100% 0%'
            },
            {
              ...animConfig,
              clipPath: '0% 0% 100% 100%'
            }
          );
          break;
        case 'scale':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0,
            scale: 0.5
          });
          break;
        case 'rotate':
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0,
            rotation: 45,
            scale: 0.5
          });
          break;
        default:
          tween = gsap.from(elements, {
            ...animConfig,
            opacity: 0
          });
      }
    }
    
    // Сохраняем анимацию
    animationRef.current = tween;
    
    // Если автозапуск отключен, останавливаем анимацию
    if (!autoStart) {
      tween.pause(0);
    }
    
    // Очистка при размонтировании
    return () => {
      if (tween) {
        tween.kill();
      }
    };
  }, [...dependencies]);
  
  /**
   * Проиграть анимацию
   */
  const play = () => {
    animationRef.current?.play();
  };
  
  /**
   * Поставить анимацию на паузу
   */
  const pause = () => {
    animationRef.current?.pause();
  };
  
  /**
   * Проиграть анимацию в обратную сторону
   */
  const reverse = () => {
    animationRef.current?.reverse();
  };
  
  /**
   * Перезапустить анимацию
   */
  const restart = () => {
    animationRef.current?.restart();
  };
  
  // Возвращаем анимацию и управляющие функции
  return {
    animation: animationRef.current,
    play,
    pause,
    reverse,
    restart
  };
};
