import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import SplitText from 'gsap/SplitText';

// Регистрируем плагин
gsap.registerPlugin(SplitText);

/**
 * Типы разбиения текста в SplitText
 */
export type SplitTextType = 'chars' | 'words' | 'lines' | 'chars,words' | 'chars,lines' | 'words,lines' | 'chars,words,lines';

/**
 * Предустановленные анимации для разбитого текста
 */
export type SplitTextAnimation = 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'rotate' | 'scale' | 'elasticScale' | 'wave' | 'randomFade' | 'custom';

/**
 * Интерфейс опций для хука useGsapSplitText
 */
export interface UseGsapSplitTextOptions {
  /**
   * Ref на элемент или селектор
   */
  target: React.RefObject<Element> | string;
  
  /**
   * Тип разбиения текста
   * @default "chars"
   */
  type?: SplitTextType;
  
  /**
   * Тип предустановленной анимации
   * @default "fadeIn"
   */
  animation?: SplitTextAnimation;
  
  /**
   * Пользовательская анимация
   */
  customAnimation?: (
    split: SplitText
  ) => gsap.core.Tween | gsap.core.Timeline;
  
  /**
   * Длительность анимации
   * @default 1
   */
  duration?: number;
  
  /**
   * Задержка между анимациями элементов
   * @default 0.05
   */
  stagger?: number;
  
  /**
   * Функция плавности
   * @default "power3.out"
   */
  ease?: string;
  
  /**
   * CSS класс для символов
   */
  charsClass?: string;
  
  /**
   * CSS класс для слов
   */
  wordsClass?: string;
  
  /**
   * CSS класс для строк
   */
  linesClass?: string;
  
  /**
   * Запускать ли анимацию автоматически
   * @default true
   */
  autoStart?: boolean;
  
  /**
   * Зависимости для пересоздания
   */
  dependencies?: any[];
  
  /**
   * Настройки Scroll Trigger для анимации
   */
  scrollTrigger?: boolean | gsap.plugins.ScrollTriggerInstanceVars;
}

/**
 * Хук для анимации текста с помощью SplitText плагина
 * 
 * @example
 * ```tsx
 * // Простая анимация появления текста
 * const { split, animation } = useGsapSplitText({
 *   target: headingRef,
 *   type: 'chars',
 *   animation: 'slideUp',
 *   stagger: 0.05
 * });
 * 
 * // Пользовательская анимация с таймлайном
 * const { split, animation, revert } = useGsapSplitText({
 *   target: paragraphRef,
 *   type: 'words,chars',
 *   animation: 'custom',
 *   customAnimation: (split) => {
 *     const tl = gsap.timeline();
 *     tl.from(split.words, { opacity: 0, y: 50, stagger: 0.1 })
 *       .from(split.chars, { color: '#ff0000', stagger: 0.02 }, "-=0.5");
 *     return tl;
 *   }
 * });
 * ```
 */
export const useGsapSplitText = (options: UseGsapSplitTextOptions) => {
  const {
    target,
    type = 'chars',
    animation = 'fadeIn',
    customAnimation,
    duration = 1,
    stagger = 0.05,
    ease = 'power3.out',
    charsClass,
    wordsClass,
    linesClass,
    autoStart = true,
    dependencies = [],
    scrollTrigger = false
  } = options;
  
  // Хранение экземпляров SplitText и анимации
  const splitTextRef = useRef<SplitText>();
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline>();
  
  // Создаем и применяем SplitText
  useEffect(() => {
    // Получаем элемент (строкой или рефом)
    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target.current;
    
    // Проверяем наличие элемента
    if (!element) return;
    
    // Создаем экземпляр SplitText
    const split = new SplitText(element, {
      type,
      charsClass,
      wordsClass,
      linesClass
    });
    
    // Сохраняем экземпляр
    splitTextRef.current = split;
    
    // Создаем и применяем анимацию
    if (autoStart) {
      let tween: gsap.core.Tween | gsap.core.Timeline;
      
      // Если есть пользовательская анимация, используем ее
      if (customAnimation) {
        tween = customAnimation(split);
      } else {
        // Определяем элементы для анимации
        const elements = type.includes('chars')
          ? split.chars
          : type.includes('words')
            ? split.words
            : split.lines;
        
        // Настройки для анимации
        const config: gsap.TweenVars = {
          duration,
          stagger,
          ease
        };
        
        // Настраиваем ScrollTrigger, если нужно
        if (scrollTrigger) {
          if (typeof scrollTrigger === 'boolean') {
            config.scrollTrigger = { trigger: element };
          } else {
            config.scrollTrigger = scrollTrigger;
          }
        }
        
        // Применяем предустановленную анимацию
        switch (animation) {
          case 'fadeIn':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0
            });
            break;
          case 'slideUp':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              y: 50
            });
            break;
          case 'slideDown':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              y: -50
            });
            break;
          case 'slideLeft':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              x: 50
            });
            break;
          case 'slideRight':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              x: -50
            });
            break;
          case 'rotate':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              rotation: 45
            });
            break;
          case 'scale':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              scale: 0.5
            });
            break;
          case 'elasticScale':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              scale: 0.5,
              ease: 'elastic.out(1, 0.3)'
            });
            break;
          case 'wave':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              y: (i) => Math.sin(i * 0.5) * 50,
              stagger: (i) => i * 0.02
            });
            break;
          case 'randomFade':
            tween = gsap.from(elements, {
              ...config,
              opacity: 0,
              stagger: {
                each: 0.05,
                from: 'random'
              }
            });
            break;
          default:
            tween = gsap.from(elements, {
              ...config,
              opacity: 0
            });
        }
      }
      
      // Сохраняем созданную анимацию
      animationRef.current = tween;
    }
    
    // Очистка при размонтировании
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
      
      if (splitTextRef.current) {
        splitTextRef.current.revert();
      }
    };
  }, [target, ...dependencies]);
  
  /**
   * Функция для перезагрузки анимации
   */
  const restart = () => {
    if (animationRef.current) {
      animationRef.current.restart();
    }
  };
  
  /**
   * Функция для возврата текста в исходное состояние
   */
  const revert = () => {
    if (splitTextRef.current) {
      splitTextRef.current.revert();
    }
  };
  
  // Возвращаем экземпляры и управляющие функции
  return {
    split: splitTextRef.current,
    animation: animationRef.current,
    restart,
    revert
  };
};
