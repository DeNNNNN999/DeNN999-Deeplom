'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';

interface SupplierLogo3DProps {
  className?: string;
  size?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  color1?: string;
  color2?: string;
}

export default function SupplierLogo3D({
  className = '',
  size = 180,
  autoRotate = true,
  interactive = true,
  color1 = '#4f46e5', // Основной цвет (indigo)
  color2 = '#06b6d4', // Акцентный цвет (cyan)
}: SupplierLogo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Инициализация Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Создаем сцену
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Устанавливаем камеру
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Создаем renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(size, size);
    rendererRef.current = renderer;

    // Прикрепляем renderer к DOM
    containerRef.current.appendChild(renderer.domElement);

    // Добавляем свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(2, 2, 2);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-2, -2, -2);
    scene.add(dirLight2);

    // Создаем группу для всех элементов логотипа
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    // Создаем элементы логотипа поставщиков
    createSupplierLogo(group, color1, color2);

    // Добавляем controls для интерактивности
    if (interactive) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = false;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1.5;
      controlsRef.current = controls;
    }

    // Анимация появления
    gsap.fromTo(
      group.position, 
      { y: -2 }, 
      { 
        y: 0, 
        duration: 1.5, 
        ease: "elastic.out(1, 0.6)",
        onComplete: () => setIsLoaded(true)
      }
    );

    // Функция для анимации и рендеринга
    const animate = () => {
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Запускаем анимацию
    animate();

    // Обработка изменения размера окна
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && containerRef.current) {
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(size, size);
      }
    };

    window.addEventListener('resize', handleResize);

    // Очистка ресурсов при размонтировании
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      // Очистка памяти
      if (sceneRef.current) {
        clearThree(sceneRef.current);
      }
    };
  }, [size, autoRotate, interactive, color1, color2]);

  // Эффект при наведении
  useEffect(() => {
    if (!groupRef.current || !isLoaded) return;

    gsap.to(groupRef.current.scale, {
      x: isHovered ? 1.1 : 1,
      y: isHovered ? 1.1 : 1,
      z: isHovered ? 1.1 : 1,
      duration: 0.5,
      ease: "power2.out"
    });

    if (controlsRef.current) {
      controlsRef.current.autoRotateSpeed = isHovered ? 3 : 1.5;
    }
  }, [isHovered, isLoaded]);

  // Функция создания логотипа поставщиков
  const createSupplierLogo = (group: THREE.Group, mainColor: string, accentColor: string) => {
    // Создаем основной куб (склад/базу)
    const baseGeometry = new THREE.BoxGeometry(2, 0.8, 1.6);
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(mainColor),
      shininess: 30,
      transparent: true,
      opacity: 0.9,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.6;
    group.add(base);

    // Добавляем верхнюю часть "крышу" со скатами
    const roofGeometry = new THREE.CylinderGeometry(0, 1.5, 0.8, 4, 1);
    roofGeometry.rotateY(Math.PI / 4); // Поворачиваем на 45 градусов
    const roofMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(accentColor),
      shininess: 50,
      transparent: true,
      opacity: 0.95,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 0.4;
    roof.scale.set(1, 0.7, 0.9);
    group.add(roof);

    // Добавляем коробки и ящики (товары) на базу
    const box1Geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const box1Material = new THREE.MeshLambertMaterial({
      color: 0xf5f5f5,
    });
    const box1 = new THREE.Mesh(box1Geometry, box1Material);
    box1.position.set(0.6, -0.2, 0.4);
    group.add(box1);

    const box2Geometry = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const box2Material = new THREE.MeshLambertMaterial({
      color: 0xffd700,
    });
    const box2 = new THREE.Mesh(box2Geometry, box2Material);
    box2.position.set(-0.6, -0.15, 0.4);
    group.add(box2);

    // Создаем "стрелку" или "путь доставки"
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-0.8, -0.2);
    arrowShape.lineTo(0.8, -0.2);
    arrowShape.lineTo(0.8, -0.4);
    arrowShape.lineTo(1.2, 0);
    arrowShape.lineTo(0.8, 0.4);
    arrowShape.lineTo(0.8, 0.2);
    arrowShape.lineTo(-0.8, 0.2);
    arrowShape.lineTo(-0.8, -0.2);

    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelOffset: 0,
      bevelSegments: 3
    };

    const arrowGeometry = new THREE.ExtrudeGeometry(arrowShape, extrudeSettings);
    const arrowMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(accentColor),
      shininess: 80,
      transparent: true,
      opacity: 0.9,
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.z = 1;
    arrow.position.y = -1;
    arrow.rotation.z = Math.PI / 6;
    arrow.scale.set(0.7, 0.7, 0.7);
    group.add(arrow);

    // Добавляем "глобус" или шар (глобальная доставка/поставки)
    const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x3366cc,
      shininess: 100,
      transparent: true,
      opacity: 0.8,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 0.9, 0);
    group.add(sphere);

    // Добавляем кольца для сферы (как меридианы)
    const ring1Geometry = new THREE.TorusGeometry(0.35, 0.03, 16, 50);
    const ringMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(accentColor),
      shininess: 80,
    });
    const ring1 = new THREE.Mesh(ring1Geometry, ringMaterial);
    ring1.position.set(0, 0.9, 0);
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);

    const ring2Geometry = new THREE.TorusGeometry(0.35, 0.03, 16, 50);
    const ring2 = new THREE.Mesh(ring2Geometry, ringMaterial);
    ring2.position.set(0, 0.9, 0);
    ring2.rotation.y = Math.PI / 2;
    group.add(ring2);

    // Изначально скрываем логотип для анимации
    group.scale.set(0, 0, 0);
    gsap.to(group.scale, {
      x: 1,
      y: 1,
      z: 1, 
      duration: 1.2, 
      delay: 0.5,
      ease: "elastic.out(1, 0.6)"
    });

    // Поворачиваем всю группу для лучшего вида
    group.rotation.x = 0.4;
  };

  // Функция очистки сцены и ресурсов
  const clearThree = (scene: THREE.Scene) => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}
