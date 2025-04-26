'use client';

import { useEffect, useRef } from 'react';

interface GradientWaveBackgroundProps {
  className?: string;
}

export default function GradientWaveBackground({ className = '' }: GradientWaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number | null>(null);

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

    // Цвета для градиента (черный, бирюзовый, тёмно-фиолетовый)
    const colors = {
      black: [15, 15, 15],       // Брутальный черный
      teal: [0, 188, 212],       // Бирюзовый (глассморфизм)
      purple: [75, 0, 130]       // Тёмно-фиолетовый (брутализм + глассморфизм)
    };

    // Упрощенные параметры волн
    const waves = [
      { amplitude: 80, length: 0.008, speed: 0.04, phase: 0 },
      { amplitude: 100, length: 0.010, speed: 0.03, phase: 2 },
      { amplitude: 60, length: 0.012, speed: 0.02, phase: 4 }
    ];

    // Анимация волн - упрощенная версия без GSAP
    const animate = () => {
      if (!contextRef.current || !canvasRef.current) return;
      
      const ctx = contextRef.current;
      const { width, height } = canvasRef.current;
      
      ctx.clearRect(0, 0, width, height);
      
      // Фоновый градиент
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, `rgb(${colors.black.join(',')})`);
      bgGradient.addColorStop(0.4, `rgb(${colors.purple.map(c => c * 0.5).join(',')})`);
      bgGradient.addColorStop(0.8, `rgb(${colors.teal.map(c => c * 0.3).join(',')})`);
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Обновление фаз волн
      waves.forEach(wave => {
        wave.phase += wave.speed;
        if (wave.phase > 1000) wave.phase = 0;
      });
      
      // Рисуем градиентные волны
      waves.forEach((wave, index) => {
        const waveGradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
        
        // Выбираем цвета в зависимости от индекса волны
        let color1, color2;
        if (index === 0) {
          color1 = colors.purple;
          color2 = colors.black;
        } else if (index === 1) {
          color1 = colors.teal;
          color2 = colors.purple;
        } else {
          color1 = colors.black;
          color2 = colors.teal;
        }
        
        const opacity1 = 0.5 - index * 0.1;
        const opacity2 = 0.2 - index * 0.05;
        
        waveGradient.addColorStop(0, `rgba(${color1.join(',')}, ${opacity1})`);
        waveGradient.addColorStop(1, `rgba(${color2.join(',')}, ${opacity2})`);
        
        ctx.fillStyle = waveGradient;
        ctx.beginPath();
        
        // Начальная точка
        ctx.moveTo(0, height);
        
        // Рисуем волну
        for (let x = 0; x < width; x++) {
          // Базовая высота волны
          const waveHeight = Math.sin(x * wave.length + wave.phase) * wave.amplitude;
          
          // Y-координата
          const y = height * 0.6 + waveHeight + index * 50;
          
          ctx.lineTo(x, y);
        }
        
        // Замыкаем путь
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      });
      
      // Сохраняем ссылку на анимацию для отмены при размонтировании
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Запуск анимации
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      // Отмена анимации при размонтировании
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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
