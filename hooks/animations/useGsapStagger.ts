import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Регистрируем плагин
gsap.registerPlugin(ScrollTrigger);

/**
 * Типы направления стагера
 */
export type StaggerDirection = 'from' | 'center' | 'edges' | 'random' | 'end';

/**
 * Типы предустановленных анимаций для стагера
 */
export type StaggerAnimation = 
  | 'fadeIn' 
  | 'fadeOut'
  | 'slideUp' 
  | 'slideDown' 
  | 'slideLeft' 
  | 'slideRight' 
  | 'scale' 
  | 'rotate' 
  | 'elastic'
  | 'bounce'
  | 'flip'
  | 'custom';

/**
 * Интерфейс опций для хука useGsapStagger
 */
export interface UseGsapStaggerOptions {
  /**
   * Ref на элементы или селектор
   */
  targets: React.RefObject<NodeList | HTMLCollection | Element[]> | string | React.RefObject<Element>[];
  
  /**
   * Тип предустановленной анимации
   * @default "fadeIn"
   */
  animation?: StaggerAnimation;
  
  /**
   * Пользовательская функция анимации
   */
  customAnimation?: (
    elements: Element[] | NodeList | HTMLCollection
  ) => gsap.core.Tween | gsap.core.Timeline;
  
  /**
   * Интервал времени между анимациями элементов
   * @default 0.1
   */
  staggerAmount?: number;
  
  /**
   * Направление стагера
   * @default "from"
   */
  staggerDirection?: StaggerDirection;
  
  /**
   * Индекс, с которого начинается стагер
   * @default 0
   */
  staggerFrom?: number | string | object;
  
  /**
   * Сетка для 2D стагера (колонки/строки)
   */
  grid?: {
    rows: number;
    cols: number;
    direction?: 'row' | 'column' | 'x' | 'y';
  };
  
  /**
   * Длительность анимации каждого элемента
   * @default 1
   */
  duration?: number;
  
  /**
   * Функция плавности
   * @default "power2.out"
   */
  ease?: string;
  
  /**
   * Задержка перед началом всего стагера
   * @default 0
   */
  delay?: number;
  
  /**
   * Использовать ли ScrollTrigger
   * @default false
   */
  useScrollTrigger?: boolean;
  
  /**
   * Настройки для ScrollTrigger
   */
  scrollTrigger?: Partial<ScrollTrigger.Vars> | string | Element;
  
  /**
   * Запускать ли анимацию автоматически
   * @default true
   */
  autoStart?: boolean;
  
  /**
   * Расстояние перемещения для эффектов slide
   * @default 50
   */
  distance?: number;
  
  /**
   * Коллбэк по завершении анимации всех элементов
   */
  onComplete?: () => void;
  
  /**
   * Повторять ли анимацию
   * @default 0
   */
  repeat?: number;
  
  /**
   * Направлять ли анимацию в обратную сторону после завершения
   * @default false
   */
  yoyo?: boolean;
  
  /**
   * Зависимости для пересоздания
   */
  dependencies?: any[];
}

/**
 * Хук для создания анимаций с эффектом стагера (последовательного появления)
 * 
 * @example
 * ```tsx
 * // Простой стагер с плавным появлением элементов
 * const { animation } = useGsapStagger({
 *   targets: '.card',
 *   animation: 'fadeIn',
 *   staggerAmount: 0.2
 * });
 * 
 * // Сложный стагер с сеткой и ScrollTrigger
 * const { animation, replay } = useGsapStagger({
 *   targets: gridItemsRef,
 *   animation: 'scale',
 *   grid: { rows: 3, cols: 4 },
 *   staggerDirection: 'center',
 *   staggerAmount: 0.1,
 *   useScrollTrigger: true,
 *   scrollTrigger: {
 *     trigger: sectionRef.current,
 *     start: 'top center',
 *     toggleActions: 'play none none reverse'
 *   }
 * });
 * 
 * // Пользовательская анимация
 * const { animation } = useGsapStagger({
 *   targets: elementsRef,
 *   animation: 'custom',
 *   customAnimation: (elements) => {
 *     return gsap.from(elements, {
 *       scale: 0,
 *       opacity: 0,
 *       rotation: 180,
 *       duration: 1.5,
 *       ease: 'elastic.out(1, 0.3)',
 *       stagger: {
 *         amount: 0.5,
 *         from: 'random'
 *       }
 *     });
 *   }
 * });
 * ```
 */
export const useGsapStagger = (options: UseGsapStaggerOptions) => {
  const {
    targets,
    animation = 'fadeIn',
    customAnimation,
    staggerAmount = 0.1,
    staggerDirection = 'from',
    staggerFrom = 0,
    grid,
    duration = 1,
    ease = 'power2.out',
    delay = 0,
    useScrollTrigger = false,
    scrollTrigger,
    autoStart = true,
    distance = 50,
    onComplete,
    repeat = 0,
    yoyo = false,
    dependencies = []
  } = options;
  
  // Хранение анимации
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline>();
  const elementsRef = useRef<Element[] | NodeList | HTMLCollection | null>(null);
  
  // Получение элементов из разных типов targets
  const getElements = () => {
    if (typeof targets === 'string') {
      // Если строка - используем как CSS селектор
      return document.querySelectorAll(targets);
    } else if (Array.isArray(targets)) {
      // Если массив рефов - извлекаем элементы
      return targets.map(ref => ref.current).filter(Boolean) as Element[];
    } else if (targets.current instanceof NodeList || targets.current instanceof HTMLCollection) {
      // Если NodeList или HTMLCollection
      return targets.current;
    } else if (Array.isArray(targets.current)) {
      // Если массив элементов
      return targets.current;
    }
    return null;
  };
  
  // Создаем и применяем анимацию
  useEffect(() => {
    const elements = getElements();
    
    // Проверяем наличие элементов
    if (!elements || elements.length === 0) return;
    
    // Сохраняем элементы для использования в методах
    elementsRef.current = elements;
    
    let tween: gsap.core.Tween | gsap.core.Timeline;
    
    // Настройка стагера
    const staggerConfig: gsap.StaggerVars = {
      amount: staggerAmount,
      from: staggerFrom
    };
    
    // Если указано направление, добавляем его
    if (staggerDirection !== 'from') {
      staggerConfig.from = staggerDirection;
    }
    
    // Если указана сетка, добавляем ее
    if (grid) {
      staggerConfig.grid = [grid.rows, grid.cols];
      staggerConfig.axis = grid.direction === 'row' || grid.direction === 'x' ? 'x' : 'y';
    }
    
    // Базовые настройки анимации
    const animConfig: gsap.TweenVars = {
      duration,
      ease,
      delay,
      stagger: staggerConfig,
      repeat,
      yoyo,
      onComplete
    };
    
    // Если используем ScrollTrigger
    if (useScrollTrigger) {
      animConfig.scrollTrigger = scrollTrigger;
    }
    
    // Если есть пользовательская анимация, используем ее
    if (customAnimation) {
      tween = customAnimation(elements);
    } else {
      // Применяем выбранную предустановленную анимацию
      switch (animation) {
        case 'fadeIn':
          tween = gsap.fromTo(elements, 
            { opacity: 0 }, 
            { ...animConfig, opacity: 1 }
          );
          break;
        case 'fadeOut':
          tween = gsap.fromTo(elements, 
            { opacity: 1 }, 
            { ...animConfig, opacity: 0 }
          );
          break;
        case 'slideUp':
          tween = gsap.fromTo(elements, 
            { y: distance, opacity: 0 }, 
            { ...animConfig, y: 0, opacity: 1 }
          );
          break;
        case 'slideDown':
          tween = gsap.fromTo(elements, 
            { y: -distance, opacity: 0 }, 
            { ...animConfig, y: 0, opacity: 1 }
          );
          break;
        case 'slideLeft':
          tween = gsap.fromTo(elements, 
            { x: distance, opacity: 0 }, 
            { ...animConfig, x: 0, opacity: 1 }
          );
          break;
        case 'slideRight':
          tween = gsap.fromTo(elements, 
            { x: -distance, opacity: 0 }, 
            { ...animConfig, x: 0, opacity: 1 }
          );
          break;
        case 'scale':
          tween = gsap.fromTo(elements, 
            { scale: 0, opacity: 0 }, 
            { ...animConfig, scale: 1, opacity: 1 }
          );
          break;
        case 'rotate':
          tween = gsap.fromTo(elements, 
            { rotation: 90, scale: 0.5, opacity: 0 }, 
            { ...animConfig, rotation: 0, scale: 1, opacity: 1 }
          );
          break;
        case 'elastic':
          tween = gsap.fromTo(elements, 
            { scale: 0, opacity: 0 }, 
            { 
              ...animConfig, 
              scale: 1, 
              opacity: 1, 
              ease: 'elastic.out(1, 0.3)' 
            }
          );
          break;
        case 'bounce':
          tween = gsap.fromTo(elements, 
            { y: -100, opacity: 0 }, 
            { 
              ...animConfig, 
              y: 0, 
              opacity: 1, 
              ease: 'bounce.out' 
            }
          );
          break;
        case 'flip':
          tween = gsap.fromTo(elements, 
            { rotationY: 180, opacity: 0 }, 
            { 
              ...animConfig, 
              rotationY: 0, 
              opacity: 1, 
              perspective: 1000,
              transformStyle: 'preserve-3d' 
            }
          );
          break;
        default:
          tween = gsap.fromTo(elements, 
            { opacity: 0 }, 
            { ...animConfig, opacity: 1 }
          );
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
      tween.kill();
    };
  }, [targets, ...dependencies]);
  
  /**
   * Проиграть анимацию с начала
   */
  const play = () => {
    animationRef.current?.play(0);
  };
  
  /**
   * Поставить анимацию на паузу
   */
  const pause = () => {
    animationRef.current?.pause();
  };
  
  /**
   * Проиграть анимацию в обратном направлении
   */
  const reverse = () => {
    animationRef.current?.reverse();
  };
  
  /**
   * Перезапустить анимацию
   */
  const replay = () => {
    animationRef.current?.restart();
  };
  
  /**
   * Воспроизвести анимацию в обратную сторону с конца
   */
  const revert = () => {
    animationRef.current?.reverse(0);
  };
  
  /**
   * Создать новую анимацию для элементов
   */
  const animate = (
    animationType: StaggerAnimation, 
    config: Partial<UseGsapStaggerOptions> = {}
  ) => {
    if (!elementsRef.current) return;
    
    const staggerConfig: gsap.StaggerVars = {
      amount: config.staggerAmount || staggerAmount,
      from: config.staggerDirection || staggerDirection,
    };
    
    // Базовые настройки анимации
    const animConfig: gsap.TweenVars = {
      duration: config.duration || duration,
      ease: config.ease || ease,
      delay: config.delay || 0,
      stagger: staggerConfig,
      repeat: config.repeat || 0,
      yoyo: config.yoyo || false,
      onComplete: config.onComplete
    };
    
    let newTween: gsap.core.Tween;
    
    // Применяем выбранную анимацию
    switch (animationType) {
      case 'fadeIn':
        newTween = gsap.to(elementsRef.current, { ...animConfig, opacity: 1 });
        break;
      case 'fadeOut':
        newTween = gsap.to(elementsRef.current, { ...animConfig, opacity: 0 });
        break;
      case 'slideUp':
        newTween = gsap.to(elementsRef.current, { ...animConfig, y: -50 });
        break;
      // Можно добавить другие типы
      default:
        newTween = gsap.to(elementsRef.current, { ...animConfig, opacity: 1 });
    }
    
    return newTween;
  };
  
  // Возвращаем анимацию и управляющие функции
  return {
    animation: animationRef.current,
    elements: elementsRef.current,
    play,
    pause,
    reverse,
    replay,
    revert,
    animate
  };
};
