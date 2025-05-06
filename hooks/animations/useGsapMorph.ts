import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

// Регистрируем плагин
gsap.registerPlugin(MorphSVGPlugin);

/**
 * Типы интерполяции для морфинга
 */
export type MorphType = 'linear' | 'rotational';

/**
 * Интерфейс опций для хука useGsapMorph
 */
export interface UseGsapMorphOptions {
  /**
   * Ref на исходный SVG элемент или селектор
   */
  from: React.RefObject<SVGElement> | string;
  
  /**
   * Ref на целевой SVG элемент или селектор
   */
  to: React.RefObject<SVGElement> | string;
  
  /**
   * Длительность анимации
   * @default 1
   */
  duration?: number;
  
  /**
   * Задержка перед началом анимации
   * @default 0
   */
  delay?: number;
  
  /**
   * Функция плавности
   * @default "power2.inOut"
   */
  ease?: string;
  
  /**
   * Тип морфинга
   * @default "linear"
   */
  morphType?: MorphType;
  
  /**
   * Индекс формы для контроля соответствия точек
   * @default "auto"
   */
  shapeIndex?: number | 'auto' | number[];
  
  /**
   * Откуда начинать морфинг
   */
  origin?: string;
  
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
   * Коллбэк при обновлении анимации
   */
  onUpdate?: () => void;
  
  /**
   * Настройки Scroll Trigger для анимации
   */
  scrollTrigger?: gsap.plugins.ScrollTriggerInstanceVars;
  
  /**
   * Зависимости для пересоздания
   */
  dependencies?: any[];
}

/**
 * Хук для морфинга между SVG элементами с использованием MorphSVGPlugin
 * 
 * @example
 * ```tsx
 * // Простой морфинг между двумя SVG элементами
 * const { animation, play, reverse } = useGsapMorph({
 *   from: circleRef,
 *   to: starRef,
 *   duration: 1.5,
 *   ease: "elastic.out(1, 0.3)"
 * });
 * 
 * // Морфинг с использованием селекторов и ScrollTrigger
 * const { animation } = useGsapMorph({
 *   from: "#circle",
 *   to: "#square",
 *   morphType: "rotational",
 *   scrollTrigger: {
 *     trigger: ".section",
 *     start: "top center",
 *     end: "bottom center",
 *     scrub: true
 *   }
 * });
 * ```
 */
export const useGsapMorph = (options: UseGsapMorphOptions) => {
  const {
    from,
    to,
    duration = 1,
    delay = 0,
    ease = 'power2.inOut',
    morphType = 'linear',
    shapeIndex = 'auto',
    origin,
    autoStart = true,
    onComplete,
    onUpdate,
    scrollTrigger,
    dependencies = []
  } = options;
  
  // Хранение анимации
  const animationRef = useRef<gsap.core.Tween>();
  
  // Создаем и применяем морфинг
  useEffect(() => {
    // Получаем элементы (строкой или рефом)
    const fromElement = typeof from === 'string'
      ? document.querySelector(from)
      : from.current;
    
    const toElement = typeof to === 'string'
      ? document.querySelector(to)
      : to.current;
    
    // Проверяем наличие элементов
    if (!fromElement || !toElement) return;
    
    // Настройки анимации
    const config: gsap.TweenVars = {
      morphSVG: {
        shape: toElement,
        type: morphType,
        shapeIndex,
        origin
      },
      duration,
      delay,
      ease,
      onComplete,
      onUpdate
    };
    
    // Если настроен ScrollTrigger, добавляем его
    if (scrollTrigger) {
      config.scrollTrigger = scrollTrigger;
    }
    
    // Создаем анимацию
    const tween = gsap.to(fromElement, config);
    
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
  }, [from, to, ...dependencies]);
  
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
  const restart = () => {
    animationRef.current?.restart();
  };
  
  // Преобразовать обычные формы в path
  const convertToPath = (element: string | SVGElement) => {
    return MorphSVGPlugin.convertToPath(element);
  };
  
  // Возвращаем анимацию и управляющие функции
  return {
    animation: animationRef.current,
    play,
    pause,
    reverse,
    restart,
    convertToPath
  };
};
