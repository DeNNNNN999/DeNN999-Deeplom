'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface WaveBackgroundProps {
  className?: string;
}

export default function WaveBackground({ className = '' }: WaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Инициализация canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    contextRef.current = ctx;
    
    // Установка размеров canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Параметры волн (более яркие и выразительные цвета)
    const waves = [
      { color: 'rgba(59, 130, 246, 0.3)', amplitude: 60, speed: 0.05, length: 0.008, phase: 0 },
      { color: 'rgba(99, 102, 241, 0.25)', amplitude: 45, speed: 0.03, length: 0.012, phase: 2 },
      { color: 'rgba(139, 92, 246, 0.2)', amplitude: 50, speed: 0.07, length: 0.01, phase: 4 },
      { color: 'rgba(30, 58, 138, 0.4)', amplitude: 70, speed: 0.04, length: 0.015, phase: 1 },
    ];

    // 3D параметры
    const perspective = 1000; // Сильнее выраженная перспектива
    const horizonY = canvas.height * 0.7; // Горизонт ниже для большего ощущения глубины

    // Анимация волн с более выраженной 3D-перспективой
    const animate = () => {
      if (!contextRef.current || !canvasRef.current) return;
      
      const ctx = contextRef.current;
      const { width, height } = canvasRef.current;
      
      ctx.clearRect(0, 0, width, height);
      
      // Добавляем темный фон-градиент для большего ощущения глубины
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, 'rgba(10, 10, 40, 0.8)');
      bgGradient.addColorStop(0.7, 'rgba(30, 58, 138, 0.5)');
      bgGradient.addColorStop(1, 'rgba(59, 130, 246, 0.3)');
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Создаем эффект "звезд" в фоне
      const starCount = 100;
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * (height * 0.7); // Звезды только в верхней части
        const radius = Math.random() * 1.5;
        const opacity = Math.random() * 0.5 + 0.3;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
      }
      
      waves.forEach((wave, index) => {
        // Обновление фазы волны для анимации
        wave.phase += wave.speed;
        if (wave.phase > 1000) wave.phase = 0;
        
        ctx.beginPath();
        
        // Градиент для волны
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        
        // Правильный формат цвета RGBA
        const baseColor = wave.color.substring(0, wave.color.lastIndexOf(','));
        gradient.addColorStop(0, `${baseColor}, 0.1)`);
        gradient.addColorStop(0.3, wave.color);
        gradient.addColorStop(0.6, `${baseColor}, ${0.1 + index * 0.05})`);
        gradient.addColorStop(1, `${baseColor}, 0.1)`);
        
        ctx.fillStyle = gradient;
        
        // Начальная точка волны слева
        ctx.moveTo(0, horizonY);
        
        // Создание волны с усиленной перспективой
        for (let x = 0; x < width; x++) {
          // Рассчитываем базовую высоту волны с большей амплитудой
          const waveHeight = Math.sin(x * wave.length + wave.phase) * wave.amplitude;
          
          // Усиленная перспектива для 3D эффекта
          // Ближние волны (нижняя часть экрана) крупнее, дальние (верхняя часть) мельче
          const distanceFromHorizon = x / width;
          const perspectiveScale = Math.pow(distanceFromHorizon, 1.5) * 1.8; // Нелинейная перспектива
          
          // Применяем затухание волн вдали для эффекта тумана
          const fogFactor = 1 - Math.min(1, distanceFromHorizon * 0.8);
          
          // Смещаем волну вниз для лучшего вида и применяем перспективу
          const screenY = horizonY + 
                          waveHeight * perspectiveScale * fogFactor + 
                          (index * 15 * perspectiveScale) + 
                          (Math.sin(Date.now() * 0.001 + index) * 10);
          
          ctx.lineTo(x, screenY);
        }
        
        // Завершаем путь вокруг нижней части экрана с добавлением глубины
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        
        // Добавляем блики на гребнях волн для усиления 3D эффекта
        if (index === 0 || index === 2) {
          ctx.beginPath();
          for (let x = 0; x < width; x += 20) {
            const waveHeight = Math.sin(x * wave.length + wave.phase);
            // Рисуем блики только на положительных гребнях волн
            if (waveHeight > 0.7) {
              const xPos = x;
              const yPos = horizonY + waveHeight * wave.amplitude * (1 - x/width*0.3) + (index * 10);
              
              ctx.moveTo(xPos, yPos);
              ctx.lineTo(xPos + 15, yPos - 5);
              
              // Градиент для блика
              const highlightGradient = ctx.createLinearGradient(xPos, yPos, xPos + 15, yPos - 5);
              highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
              highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
              highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
              
              ctx.strokeStyle = highlightGradient;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }
        }
      });
      
      requestAnimationFrame(animate);
    };
    
    // Запуск анимации
    const animationId = requestAnimationFrame(animate);
    
    // Дополнительная интерактивность с GSAP
    const timeline = gsap.timeline({
      repeat: -1, 
      yoyo: true, 
      repeatDelay: 5,
      onUpdate: () => {
        // Плавно меняем параметры волн для дополнительной динамики
        waves.forEach((wave, i) => {
          wave.length = waves[i].length * (1 + Math.sin(Date.now() * 0.0005) * 0.2);
          wave.amplitude = waves[i].amplitude * (1 + Math.sin(Date.now() * 0.0003 + i) * 0.15);
        });
      }
    });
    
    // Более динамичное изменение параметров волн
    timeline
      .to(waves[0], { amplitude: 90, duration: 10, ease: "sine.inOut" }, 0)
      .to(waves[1], { length: 0.03, duration: 15, ease: "sine.inOut" }, 5)
      .to(waves[2], { amplitude: 70, speed: 0.09, duration: 20, ease: "sine.inOut" }, 2)
      .to(waves[3], { length: 0.02, amplitude: 100, duration: 15, ease: "sine.inOut" }, 8);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
      timeline.kill();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
