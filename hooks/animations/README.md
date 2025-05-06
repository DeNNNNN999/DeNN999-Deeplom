# GSAP Animation Hooks для React

Коллекция мощных React-хуков для создания анимаций с использованием GSAP (GreenSock Animation Platform).

## Установка

Для использования этих хуков необходимо установить GSAP:

```bash
npm install gsap
# или
yarn add gsap
```

## Обзор хуков

Эта библиотека предоставляет следующие хуки:

- `useGsapTimeline`: Создает и управляет GSAP таймлайнами
- `useGsapScrollTrigger`: Создает анимации, связанные с прокруткой
- `useGsapInteraction`: Создает интерактивные анимации при взаимодействии с элементами
- `useGsapSplitText`: Разбивает текст на символы, слова или строки и анимирует их
- `useGsapMorph`: Создает морфинг-анимации между SVG элементами
- `useGsapReveal`: Создает эффекты появления элементов
- `useGsapParallax`: Создает эффекты параллакса при скролле
- `useGsapStagger`: Создает последовательные анимации с эффектом задержки

## Примеры использования

### useGsapTimeline

```tsx
import { useRef, useEffect } from 'react';
import { useGsapTimeline } from './hooks/animations';

const Component = () => {
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Создаем таймлайн
  const tl = useGsapTimeline({
    paused: true,
    timelineOptions: { 
      defaults: { duration: 1, ease: 'power2.out' } 
    }
  });
  
  useEffect(() => {
    if (elementRef.current) {
      // Добавляем анимации в таймлайн
      tl.to(elementRef.current, { x: 100 })
        .to(elementRef.current, { y: 50 })
        .to(elementRef.current, { rotation: 45 });
    }
  }, []);
  
  return (
    <div>
      <div ref={elementRef} className="box">Анимированный элемент</div>
      <button onClick={() => tl.play()}>Play</button>
      <button onClick={() => tl.reverse()}>Reverse</button>
    </div>
  );
};
```

### useGsapScrollTrigger

```tsx
import { useRef } from 'react';
import { useGsapScrollTrigger } from './hooks/animations';

const Component = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Создаем анимацию при скролле
  useGsapScrollTrigger({
    trigger: sectionRef,
    animation: 'fadeIn',
    start: 'top center',
    markers: true
  });
  
  return (
    <div>
      <div style={{ height: '100vh' }}>Прокрути вниз</div>
      <div ref={sectionRef} className="section">
        Этот блок появится при прокрутке
      </div>
    </div>
  );
};
```

### useGsapSplitText

```tsx
import { useRef } from 'react';
import { useGsapSplitText } from './hooks/animations';

const Component = () => {
  const textRef = useRef<HTMLHeadingElement>(null);
  
  // Разбиваем текст на символы и анимируем их
  const { restart } = useGsapSplitText({
    target: textRef,
    type: 'chars',
    animation: 'slideUp',
    stagger: 0.05,
    duration: 0.8,
    ease: 'back.out(1.7)'
  });
  
  return (
    <div>
      <h1 ref={textRef}>Анимированный текст</h1>
      <button onClick={restart}>Перезапустить анимацию</button>
    </div>
  );
};
```

### useGsapMorph

```tsx
import { useRef } from 'react';
import { useGsapMorph } from './hooks/animations';

const Component = () => {
  const circleRef = useRef<SVGCircleElement>(null);
  const starRef = useRef<SVGPathElement>(null);
  
  // Создаем морфинг между кругом и звездой
  const { play, reverse } = useGsapMorph({
    from: circleRef,
    to: starRef,
    duration: 1.5,
    ease: 'elastic.out(1, 0.3)',
    autoStart: false
  });
  
  return (
    <div>
      <svg width="400" height="200" viewBox="0 0 400 200">
        <circle ref={circleRef} cx="100" cy="100" r="50" fill="purple" />
        <path 
          ref={starRef} 
          d="M150,50 L170,90 L210,100 L170,110 L150,150 L130,110 L90,100 L130,90 Z" 
          fill="orange" 
          style={{ visibility: 'hidden' }} 
        />
      </svg>
      
      <button onClick={play}>Морфинг</button>
      <button onClick={reverse}>Назад</button>
    </div>
  );
};
```

### useGsapReveal и useGsapStagger

```tsx
import { useRef } from 'react';
import { useGsapReveal, useGsapStagger } from './hooks/animations';

const Component = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Создаем эффект появления для заголовка
  useGsapReveal({
    targets: '.title',
    effect: 'slideUp',
    useScrollTrigger: true,
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top bottom-=100'
    }
  });
  
  // Создаем последовательное появление карточек
  useGsapStagger({
    targets: '.card',
    animation: 'fadeIn',
    staggerAmount: 0.2,
    staggerDirection: 'from',
    useScrollTrigger: true,
    scrollTrigger: sectionRef.current
  });
  
  return (
    <div ref={sectionRef} className="section">
      <h2 className="title">Наши продукты</h2>
      
      <div className="cards">
        <div className="card">Карточка 1</div>
        <div className="card">Карточка 2</div>
        <div className="card">Карточка 3</div>
        <div className="card">Карточка 4</div>
      </div>
    </div>
  );
};
```

## Лицензия

Хуки доступны для свободного использования в коммерческих и некоммерческих проектах. Обратите внимание, что GSAP имеет собственную лицензию, с которой необходимо ознакомиться: [GreenSock License](https://gsap.com/standard-license/).

> Обратите внимание, что с 2025 года, благодаря приобретению Webflow, все плагины GSAP стали бесплатными для использования, включая ранее платные плагины SplitText, MorphSVG и другие.
