'use client'

import { useEffect, useRef } from 'react'

interface GradientWaveBackgroundProps {
  className?: string
}

export default function GradientWaveBackground({ className = '' }: GradientWaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const timeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const resolutionUniformRef = useRef<WebGLUniformLocation | null>(null)
  const timeUniformRef = useRef<WebGLUniformLocation | null>(null)

  // GLSL фрагментный шейдер для волн
  const fragmentShaderSource = `
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_time;

    // Простая функция шума для создания органичности
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // Функция для градиентных волн
    float wave(vec2 position, float time, float frequency, float amplitude, float speed) {
      return sin(position.x * frequency + time * speed) * amplitude;
    }

    void main() {
      // Нормализованные координаты
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;

      // Фоновый градиент (сверху вниз)
      vec3 bgColor = mix(
        vec3(0.06, 0.07, 0.1), // Темно-синий сверху
        vec3(0.1, 0.12, 0.18),  // Немного светлее внизу
        uv.y
      );

      // Параметры волн
      float time = u_time * 0.5;
      float wave1 = wave(uv, time, 10.0, 0.03, 1.0);
      float wave2 = wave(uv, time, 20.0, 0.02, 0.8);
      float wave3 = wave(uv, time, 5.0, 0.01, 1.2);

      // Комбинированная волна
      float combinedWave = wave1 + wave2 + wave3;

      // Пороги для волн
      float threshold1 = 0.6 + 0.05 * sin(time * 0.2);
      float threshold2 = 0.7 + 0.05 * sin(time * 0.3);

      // Цвета волн
      vec3 waveColor1 = vec3(0.0, 0.74, 0.83); // Бирюзовый
      vec3 waveColor2 = vec3(0.29, 0.0, 0.51); // Индиго

      // Финальный цвет с волнами
      vec3 color = bgColor;

      // Создаем первую волну
      if (uv.y > threshold1 + combinedWave * 0.2) {
        float wave1Blend = smoothstep(threshold1 + combinedWave * 0.2, threshold1 + 0.01 + combinedWave * 0.2, uv.y);
        color = mix(color, waveColor1 * 0.6, wave1Blend * 0.7);
      }

      // Создаем вторую волну
      if (uv.y > threshold2 + combinedWave * 0.1) {
        float wave2Blend = smoothstep(threshold2 + combinedWave * 0.1, threshold2 + 0.01 + combinedWave * 0.1, uv.y);
        color = mix(color, waveColor2 * 0.4, wave2Blend * 0.6);
      }

      // Добавляем немного шума для текстуры
      float noiseValue = noise(uv * 100.0) * 0.02;
      color += noiseValue;

      // Затемнение по краям (виньетирование)
      float distFromCenter = length(uv - 0.5) * 1.5;
      color *= 1.0 - distFromCenter * 0.5;

      gl_FragColor = vec4(color, 1.0);
    }
  `

  // Простой вершинный шейдер
  const vertexShaderSource = `
    attribute vec2 a_position;

    void main() {
      gl_Position = vec4(a_position, 0, 1);
    }
  `

  useEffect(() => {
    if (!canvasRef.current) return

    // Инициализация и настройка WebGL
    const setupWebGL = () => {
      const canvas = canvasRef.current
      if (!canvas) return false

      // Получаем WebGL контекст
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
      if (!gl) {
        console.error('WebGL не поддерживается')
        return false
      }

      contextRef.current = gl

      // Создаем и компилируем вершинный шейдер
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)
      if (!vertexShader) return false

      gl.shaderSource(vertexShader, vertexShaderSource)
      gl.compileShader(vertexShader)

      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Ошибка компиляции вершинного шейдера: ' + gl.getShaderInfoLog(vertexShader))
        return false
      }

      // Создаем и компилируем фрагментный шейдер
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
      if (!fragmentShader) return false

      gl.shaderSource(fragmentShader, fragmentShaderSource)
      gl.compileShader(fragmentShader)

      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Ошибка компиляции фрагментного шейдера: ' + gl.getShaderInfoLog(fragmentShader))
        return false
      }

      // Создаем и линкуем программу
      const program = gl.createProgram()
      if (!program) return false

      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Ошибка линковки программы: ' + gl.getProgramInfoLog(program))
        return false
      }

      programRef.current = program

      // Устанавливаем вершины (2 треугольника для заполнения экрана)
      const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0])

      const vertexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

      // Получаем атрибут позиции и включаем его
      const positionAttrib = gl.getAttribLocation(program, 'a_position')
      gl.enableVertexAttribArray(positionAttrib)
      gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0)

      // Получаем юниформы
      resolutionUniformRef.current = gl.getUniformLocation(program, 'u_resolution')
      timeUniformRef.current = gl.getUniformLocation(program, 'u_time')

      return true
    }

    const resizeCanvas = () => {
      if (!canvasRef.current || !contextRef.current) return

      const canvas = canvasRef.current
      const gl = contextRef.current

      // Устанавливаем размер canvas равным размеру экрана
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const render = (timestamp: number) => {
      if (!contextRef.current || !programRef.current) return

      const gl = contextRef.current
      const program = programRef.current

      // Используем шейдерную программу
      gl.useProgram(program)

      // Обновляем юниформы
      if (resolutionUniformRef.current) {
        gl.uniform2f(resolutionUniformRef.current, canvasRef.current!.width, canvasRef.current!.height)
      }

      if (timeUniformRef.current) {
        timeRef.current += 0.01 // Медленное плавное изменение времени
        gl.uniform1f(timeUniformRef.current, timeRef.current)
      }

      // Рендерим полноэкранный квад
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Запрашиваем следующий кадр
      animationRef.current = requestAnimationFrame(render)
    }

    // Инициализация
    if (setupWebGL()) {
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
      animationRef.current = requestAnimationFrame(render)
    }

    // Очистка
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      // Освобождаем ресурсы WebGL
      if (contextRef.current && programRef.current) {
        const gl = contextRef.current
        gl.deleteProgram(programRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
