'use client';

import React from 'react';

interface ReactLogoProps {
  className?: string;
  size?: number;
}

export default function ReactLogo({ className = '', size = 80 }: ReactLogoProps) {
  // Упрощенная версия без использования React Spring
  return (
    <svg
      viewBox="-11.5 -10.23174 23 20.46348"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle r="2.05" fill="#61dafb" />
      <g stroke="#61dafb" fill="none" strokeWidth="0.5">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}
