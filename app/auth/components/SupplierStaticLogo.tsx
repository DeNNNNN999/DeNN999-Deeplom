'use client';

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

interface SupplierStaticLogoProps {
  className?: string;
  size?: number;
  color1?: string;
  color2?: string;
}

export default function SupplierStaticLogo({
  className = '',
  size = 120,
  color1 = '#4f46e5', // Основной цвет (indigo)
  color2 = '#06b6d4', // Акцентный цвет (cyan)
}: SupplierStaticLogoProps) {
  const logoRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!logoRef.current || !iconsRef.current) return;

    // Анимируем появление логотипа
    gsap.fromTo(
      logoRef.current,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
    );

    // Анимация появления иконок внутри логотипа
    const icons = iconsRef.current.querySelectorAll('.logo-icon');
    gsap.fromTo(
      icons,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        stagger: 0.1, 
        duration: 0.5, 
        ease: "back.out(1.4)", 
        delay: 0.3 
      }
    );

    // Мягкая пульсация логотипа
    gsap.to(logoRef.current, {
      scale: 1.02,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, []);

  return (
    <div 
      ref={logoRef}
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Основной круг логотипа */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(45deg, ${color1}, ${color2})`,
          boxShadow: `0 0 30px rgba(79, 70, 229, 0.3)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Стилизованная сетка в фоне */}
        <div className="absolute inset-0 opacity-10" 
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '10px 10px'
          }}
        />
        
        {/* Волнистая линия в фоне */}
        <div className="absolute inset-0" 
          style={{
            opacity: 0.4,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 25 20, 50 10 Q 75 0, 100 10' stroke='white' fill='none' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 20px',
            backgroundRepeat: 'repeat'
          }}
        />
      </div>
      
      {/* Внутренний круг с белым фоном */}
      <div 
        className="absolute"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      />
      
      {/* Содержимое логотипа */}
      <div 
        ref={iconsRef}
        className="relative z-10 flex flex-col items-center justify-center"
        style={{
          width: size * 0.7,
          height: size * 0.7,
        }}
      >
        {/* Иконка глобуса наверху */}
        <div className="logo-icon absolute" style={{ top: '-10%' }}>
          <Icon 
            icon="solar:globe-bold" 
            style={{ color: color1, fontSize: size * 0.22 }} 
          />
        </div>
        
        {/* Центральный значок (коробка/склад) */}
        <div className="logo-icon">
          <Icon 
            icon="solar:box-bold-duotone" 
            style={{ color: color1, fontSize: size * 0.3 }} 
          />
        </div>
        
        {/* Иконки грузовика и самолета в нижней части */}
        <div className="logo-icon absolute" style={{ bottom: '10%', left: '5%' }}>
          <Icon 
            icon="solar:truck-bold" 
            style={{ color: color2, fontSize: size * 0.18 }} 
          />
        </div>
        
        <div className="logo-icon absolute" style={{ bottom: '10%', right: '5%' }}>
          <Icon 
            icon="solar:plane-bold" 
            style={{ color: color2, fontSize: size * 0.18 }} 
          />
        </div>
        
        {/* Круговая стрелка вокруг */}
        <div className="logo-icon absolute inset-0">
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M50,10 A40,40 0 1 1 10,50 A40,40 0 1 1 90,50" 
              stroke={color1} 
              strokeWidth="2" 
              strokeDasharray="5,5" 
              fill="none"
              strokeLinecap="round"
            />
            <path 
              d="M90,50 L83,43 M90,50 L83,57" 
              stroke={color1} 
              strokeWidth="2" 
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      
      {/* Блики на логотипе */}
      <div 
        className="absolute"
        style={{
          top: '10%',
          left: '15%',
          width: size * 0.1,
          height: size * 0.1,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.5)',
          filter: 'blur(5px)'
        }}
      />
      <div 
        className="absolute"
        style={{
          top: '20%',
          left: '25%',
          width: size * 0.05,
          height: size * 0.05,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.7)',
          filter: 'blur(3px)'
        }}
      />
    </div>
  );
}
