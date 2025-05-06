import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

/**
 * Типы событий для интерактивных анимаций
 */
export type InteractionEventType = 
  | 'hover'
  | 'click'
  | 'mouseenter'
  | 'mouseleave'
  | 'mousemove'
  | 'focus'
  | 'blur';

/**
 * Тип функции-обработчика анимации
 */
export type AnimationHandler = (
  element: Element,
  event?: Event
) => gsap.core.Tween | gsap.core.Timeline;

/**
 * Интерфейс опций для хука useGsapInteraction
 */
export interface UseGsapInteractionOptions {
  /**
   * Ref на элемент или селектор
   */
  target: React.RefObject<Element> | string;
  
  /**
   * Анимация при наведении курсора
   */
  onHover?: AnimationHandler;
  
  /**
   * Анимация при уходе курсора
   */
  onLeave?: AnimationHandler;
  
  /**
   * Анимация при клике
   */
  onClick?: AnimationHandler;
  
  /**
   * Анимация при получении фокуса
   */
  onFocus?: AnimationHandler;
  
  /**
   * Анимация при потере фокуса
   */
  onBlur?: AnimationHandler;
  
  /**
   * Анимация при движении мыши
   */
  onMouseMove?: AnimationHandler;
  
  /**
   * Зависимости для пересоздания хука
   */
  dependencies?: any[];
}

/**
 * Хук для создания интерактивных анимаций на основе пользовательских событий
 * 
 * @example
 * ```tsx
 * // Анимация при наведении и клике
 * const { currentAnimation } = useGsapInteraction({
 *   target: buttonRef,
 *   onHover: (element) => {
 *     return gsap.to(element, { scale: 1.1, duration: 0.3 });
 *   },
 *   onLeave: (element) => {
 *     return gsap.to(element, { scale: 1, duration: 0.3 });
 *   },
 *   onClick: (element) => {
 *     return gsap.to(element, { 
 *       backgroundColor: '#ff0000', 
 *       color: '#ffffff',
 *       duration: 0.5,
 *       yoyo: true,
 *       repeat: 1 
 *     });
 *   }
 * });
 * ```
 */
export const useGsapInteraction = (options: UseGsapInteractionOptions) => {
  const {
    target,
    onHover,
    onLeave,
    onClick,
    onFocus,
    onBlur,
    onMouseMove,
    dependencies = []
  } = options;
  
  // Сохраняем текущую активную анимацию
  const [currentAnimation, setCurrentAnimation] = useState<gsap.core.Tween | gsap.core.Timeline | null>(null);
  // Хранение элемента-мишени
  const targetRef = useRef<Element | null>(null);
  
  useEffect(() => {
    // Получаем элемент (строкой или рефом)
    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target.current;
    
    // Проверяем наличие элемента
    if (!element) return;
    
    // Сохраняем элемент в реф
    targetRef.current = element;
    
    // Обработчики событий
    const handlers: Record<string, (e: Event) => void> = {};
    
    // Обработчик наведения
    if (onHover) {
      handlers.mouseenter = (e: Event) => {
        // Останавливаем предыдущую анимацию, если есть
        if (currentAnimation) {
          currentAnimation.kill();
        }
        // Создаем новую анимацию
        const animation = onHover(element, e);
        setCurrentAnimation(animation);
      };
    }
    
    // Обработчик ухода курсора
    if (onLeave) {
      handlers.mouseleave = (e: Event) => {
        // Останавливаем предыдущую анимацию, если есть
        if (currentAnimation) {
          currentAnimation.kill();
        }
        // Создаем новую анимацию
        const animation = onLeave(element, e);
        setCurrentAnimation(animation);
      };
    }
    
    // Обработчик клика
    if (onClick) {
      handlers.click = (e: Event) => {
        // Не останавливаем предыдущую анимацию, так как клик может происходить во время ховера
        const animation = onClick(element, e);
        setCurrentAnimation(animation);
      };
    }
    
    // Обработчик фокуса
    if (onFocus) {
      handlers.focus = (e: Event) => {
        if (currentAnimation) {
          currentAnimation.kill();
        }
        const animation = onFocus(element, e);
        setCurrentAnimation(animation);
      };
    }
    
    // Обработчик потери фокуса
    if (onBlur) {
      handlers.blur = (e: Event) => {
        if (currentAnimation) {
          currentAnimation.kill();
        }
        const animation = onBlur(element, e);
        setCurrentAnimation(animation);
      };
    }
    
    // Обработчик движения мыши
    if (onMouseMove) {
      handlers.mousemove = (e: Event) => {
        // Обычно не убиваем предыдущую анимацию для mousemove
        const animation = onMouseMove(element, e);
        setCurrentAnimation(animation);
      };
    }
    
    // Добавляем все обработчики событий
    for (const [event, handler] of Object.entries(handlers)) {
      element.addEventListener(event, handler);
    }
    
    // Очистка при размонтировании
    return () => {
      // Удаляем все обработчики
      for (const [event, handler] of Object.entries(handlers)) {
        element.removeEventListener(event, handler);
      }
      
      // Останавливаем текущую анимацию
      if (currentAnimation) {
        currentAnimation.kill();
      }
    };
  }, [target, ...dependencies]);
  
  // Возвращаем элемент и текущую анимацию
  return {
    element: targetRef.current,
    currentAnimation
  };
};
