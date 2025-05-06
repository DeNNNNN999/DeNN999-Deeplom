/**
 * Типы для хуков GSAP анимаций
 */

// Базовые типы GSAP 
export type GSAPElement = string | Element | Element[] | NodeList | null;

export type GSAPTweenTarget = GSAPElement | SVGElement | object | object[];

export type GSAPDistributeFunc = (index: number, target: any, targets: any[]) => number;

export type GSAPStaggerFromFunc = (index: number, target: any, targets: any[]) => number | string | object;

export type GSAPCallback = (index?: number, target?: any, targets?: any[]) => void;

// Типы для анимаций
export type EasingFunction = string | ((progress: number) => number);

// Типы для стагера
export type StaggerVarsObject = {
  amount?: number;
  each?: number;
  from?: string | number | object | GSAPStaggerFromFunc;
  grid?: [number, number];
  axis?: string;
  ease?: EasingFunction;
  repeat?: number;
  yoyo?: boolean;
  onStart?: GSAPCallback;
  onComplete?: GSAPCallback;
  [key: string]: any;
};

export type StaggerValue = number | StaggerVarsObject;

// Направления анимаций
export type DirectionX = 'left' | 'right' | 'center' | number;
export type DirectionY = 'top' | 'bottom' | 'center' | number;

// Типы для обрезки
export type ClipPath = string | {
  type?: 'rect' | 'circle' | 'ellipse' | 'polygon' | 'inset';
  values: number[] | string[];
  units?: string | string[];
};

// Типы для трансформаций
export type Transforms = {
  x?: number | string;
  y?: number | string;
  z?: number | string;
  xPercent?: number;
  yPercent?: number;
  rotation?: number | string;
  rotationX?: number | string;
  rotationY?: number | string;
  rotationZ?: number | string;
  skewX?: number | string;
  skewY?: number | string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  transformOrigin?: string;
  transformPerspective?: number;
  transform?: string;
};

// Контекст GSAP для работы с React
export type GSAPContext = {
  add: (animation: any) => GSAPContext;
  revert: () => void;
};

// Типы для ScrollTrigger
export interface ScrollTriggerVars {
  trigger?: GSAPElement;
  start?: string | number | ((self?: any) => string | number);
  end?: string | number | ((self?: any) => string | number);
  markers?: boolean;
  id?: string;
  toggleClass?: string | boolean;
  toggleActions?: string;
  anticipatePin?: number;
  pin?: boolean | GSAPElement;
  pinSpacing?: boolean | string;
  pinType?: string;
  scrub?: boolean | number;
  snap?: number | number[] | object | ((progress: number, self: any) => any);
  once?: boolean;
  onEnter?: (self?: any) => void;
  onEnterBack?: (self?: any) => void;
  onLeave?: (self?: any) => void;
  onLeaveBack?: (self?: any) => void;
  onToggle?: (self?: any) => void;
  onUpdate?: (self?: any) => void;
  onRefresh?: (self?: any) => void;
  invalidateOnRefresh?: boolean;
  fastScrollEnd?: boolean | number;
  preventOverlaps?: boolean | string;
  horizontal?: boolean;
  onScrubComplete?: (self?: any) => void;
  [key: string]: any;
}

// Типы для SplitText
export interface SplitTextOptions {
  type?: string;
  charsClass?: string;
  wordsClass?: string;
  linesClass?: string;
  position?: string;
  reduceWhiteSpace?: boolean;
  wordDelimiter?: string;
  tag?: string;
  wordsTag?: string;
  charsTag?: string;
  linesTag?: string;
  splitClass?: string;
  lineThreshold?: number;
  [key: string]: any;
}

// Типы для MorphSVG
export interface MorphSVGOptions {
  shape?: string | SVGElement;
  type?: 'linear' | 'rotational';
  origin?: string;
  shapeIndex?: number | 'auto' | number[];
  precompile?: 'log' | string[];
  map?: 'size' | 'position' | 'complexity';
  render?: (rawPath: any) => void;
  updateTarget?: boolean;
  [key: string]: any;
}

// Общий интерфейс для всех хуков анимации
export interface GSAPAnimationHook<T = any> {
  animation?: gsap.core.Tween | gsap.core.Timeline;
  play?: () => void;
  pause?: () => void;
  reverse?: () => void;
  restart?: () => void;
  kill?: () => void;
  [key: string]: any;
}
