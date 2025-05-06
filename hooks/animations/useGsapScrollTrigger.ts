import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Регистрируем плагин
gsap.registerPlugin(ScrollTrigger);

/**
 * Возможные типы предустановленных анимаций
 */
export type ScrollTriggerAnimation = 
  | 'fadeIn' 
  | 'fadeOut'
  | 'slideUp' 
  | 'slideDown' 
  | 'slideLeft' 
  | 'slideRight' 
  | 'scale' 
  | 'rotate' 
  | 'custom';

/**
 * Интерфейс опций для хука useGsapScrollTrigger
 */
export interface UseGsapScrollTriggerOptions {
  /**
   * Ref на элемент-триггер или селектор
   */
  trigger: React.RefObject<Element> | string;
  
  /**
   * Начальная точка триггера
   * @default "top bottom"
   */
  start?: string;
  
  /**
   * Конечная точка триггера
   * @default "bottom top"
   */
  end?: string;
  
  /**
   * Тип предустановленной анимации
   * @default "fadeIn"
   */
  animation?: ScrollTriggerAnimation;
  
  /**
   * Пользовательская функция анимации
   */
  customAnimation?: (element: Element | string) => gsap.core.Tween | gsap.core.Timeline;
  
  /**
   * Привязать анимацию к скроллу (scrub)
   * @default false
   */
  scrub?: boolean | number;
  
  /**
   * Закрепить элемент при скролле (pin)
   * @default false
   */
  pin?: boolean;
  
  /**
   * Показать маркеры для отладки
   * @default false
   */
  markers?: boolean;
  
  /**
   * Действия при переключении
   * @default "play none none none"
   */
  toggleActions?: string;
  
  /**
   * Событие при входе в зону видимости
   */
  onEnter?: () => void;
  
  /**
   * Событие при выходе из зоны видимости
   */
  onLeave?: () => void;
  
  /**
   * Событие при возвращении в зону видимости
   */
  onEnterBack?: () => void;
  
  /**
   * Событие при выходе из зоны видимости назад
   */
  onLeaveBack?: () => void;
  
  /**
   * Дополнительные настройки ScrollTrigger
   */
  scrollTriggerOptions?: Partial<ScrollTrigger.Vars>;
}

/**
 * Хук для создания ScrollTrigger анимаций
 * 
 * @example
 * ```tsx
 * // Простое использование с предустановленной анимацией
 * const { scrollTrigger, animation } = useGsapScrollTrigger({
 *   trigger: sectionRef,
 *   animation: 'fadeIn',
 *   start: 'top center',
 *   markers: true
 * });
 * 
 * // Пользовательская анимация
 * useGsapScrollTrigger({
 *   trigger: elementRef,
 *   animation: 'custom',
 *   customAnimation: (element) => {
 *     return gsap.from(element, {
 *       scale: 0.5,
 *       opacity: 0,
 *       duration: 1,
 *       ease: 'power2.out'
 *     });
 *   },
 *   scrub: 0.5
 * });
 * ```
 */
export const useGsapScrollTrigger = (options: UseGsapScrollTriggerOptions) => {
  const {
    trigger,
    start = 'top bottom',
    end = 'bottom top',
    animation = 'fadeIn',
    customAnimation,
    scrub = false,
    pin = false,
    markers = false,
    toggleActions = 'play none none none',
    onEnter,
    onLeave,
    onEnterBack,
    onLeaveBack,
    scrollTriggerOptions = {}
  } = options;
  
  // Ссылки на созданные экземпляры ScrollTrigger и анимации
  const scrollTriggerRef = useRef<ScrollTrigger>();
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline>();
  
  useEffect(() => {
    // Получаем элемент для анимации (стригом или рефом)
    const element = typeof trigger === 'string' 
      ? trigger 
      : trigger.current;
    
    // Проверяем наличие элемента
    if (!element) return;
    
    // Переменная для хранения созданной анимации
    let tween: gsap.core.Tween | gsap.core.Timeline;
    
    // Создаем анимацию
    if (customAnimation) {
      // Используем пользовательскую анимацию
      tween = customAnimation(element);
    } else {
      // Используем предустановленную анимацию
      switch (animation) {
        case 'fadeIn':
          tween = gsap.fromTo(element, 
            { autoAlpha: 0 }, 
            { autoAlpha: 1, duration: 1 }
          );
          break;
        case 'fadeOut':
          tween = gsap.fromTo(element, 
            { autoAlpha: 1 }, 
            { autoAlpha: 0, duration: 1 }
          );
          break;
        case 'slideUp':
          tween = gsap.fromTo(element, 
            { y: 100, autoAlpha: 0 }, 
            { y: 0, autoAlpha: 1, duration: 1 }
          );
          break;
        case 'slideDown':
          tween = gsap.fromTo(element, 
            { y: -100, autoAlpha: 0 }, 
            { y: 0, autoAlpha: 1, duration: 1 }
          );
          break;
        case 'slideLeft':
          tween = gsap.fromTo(element, 
            { x: 100, autoAlpha: 0 }, 
            { x: 0, autoAlpha: 1, duration: 1 }
          );
          break;
        case 'slideRight':
          tween = gsap.fromTo(element, 
            { x: -100, autoAlpha: 0 }, 
            { x: 0, autoAlpha: 1, duration: 1 }
          );
          break;
        case 'scale':
          tween = gsap.fromTo(element, 
            { scale: 0.5, autoAlpha: 0 }, 
            { scale: 1, autoAlpha: 1, duration: 1 }
          );
          break;
        case 'rotate':
          tween = gsap.fromTo(element, 
            { rotation: -45, autoAlpha: 0 }, 
            { rotation: 0, autoAlpha: 1, duration: 1 }
          );
          break;
        default:
          tween = gsap.fromTo(element, 
            { autoAlpha: 0 }, 
            { autoAlpha: 1, duration: 1 }
          );
      }
    }
    
    // Сохраняем анимацию в реф
    animationRef.current = tween;
    
    // Создаем ScrollTrigger
    scrollTriggerRef.current = ScrollTrigger.create({
      trigger: element,
      start,
      end,
      animation: tween,
      scrub,
      pin,
      markers,
      toggleActions,
      onEnter,
      onLeave,
      onEnterBack,
      onLeaveBack,
      ...scrollTriggerOptions
    });
    
    // Очистка при размонтировании
    return () => {
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
      tween.kill();
    };
  }, [
    trigger, start, end, animation, customAnimation, 
    scrub, pin, markers, toggleActions,
    onEnter, onLeave, onEnterBack, onLeaveBack
  ]);
  
  // Возвращаем ссылки на созданные экземпляры
  return {
    scrollTrigger: scrollTriggerRef.current,
    animation: animationRef.current
  };
};
