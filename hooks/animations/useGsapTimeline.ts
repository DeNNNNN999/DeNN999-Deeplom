import { useRef, useEffect } from 'react';
import gsap from 'gsap';

/**
 * Интерфейс опций для хука useGsapTimeline
 */
export interface UseGsapTimelineOptions {
  /**
   * Массив зависимостей для пересоздания таймлайна
   */
  dependencies?: any[];
  
  /**
   * Возвращать ли анимацию в исходное состояние при размонтировании
   */
  revertOnUnmount?: boolean;
  
  /**
   * Состояние таймлайна при создании
   */
  paused?: boolean;
  
  /**
   * Опции таймлайна GSAP
   */
  timelineOptions?: gsap.core.TimelineVars;
}

/**
 * Хук для создания и управления GSAP таймлайнами
 * 
 * @example
 * ```tsx
 * const tl = useGsapTimeline();
 * 
 * // Используем таймлайн в useEffect или другом хуке
 * useEffect(() => {
 *   tl.to('.box', { x: 100, duration: 1 })
 *     .to('.box', { y: 50, duration: 0.5 })
 *     .to('.box', { rotation: 45, duration: 0.8 });
 * }, []);
 * 
 * // Контролируем воспроизведение
 * const handlePlay = () => tl.play();
 * const handlePause = () => tl.pause();
 * const handleReverse = () => tl.reverse();
 * ```
 */
export const useGsapTimeline = (options: UseGsapTimelineOptions = {}) => {
  const { 
    dependencies = [], 
    revertOnUnmount = true,
    paused = false,
    timelineOptions = {}
  } = options;
  
  // Создаем ссылку на таймлайн
  const timeline = useRef<gsap.core.Timeline>();
  
  // Создаем таймлайн при монтировании компонента
  useEffect(() => {
    // Создаем новый таймлайн с указанными опциями
    timeline.current = gsap.timeline({
      paused,
      ...timelineOptions
    });
    
    // Очистка при размонтировании или изменении зависимостей
    return () => {
      if (timeline.current) {
        if (revertOnUnmount) {
          timeline.current.revert(); // Полная очистка всех анимаций и возврат к исходному состоянию
        } else {
          timeline.current.kill(); // Просто остановка без возврата к исходному состоянию
        }
      }
    };
  }, dependencies); // Зависимости для пересоздания таймлайна
  
  // Возвращаем текущий таймлайн для использования
  return timeline.current as gsap.core.Timeline;
};
