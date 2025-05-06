'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface BacksideLoginProps {
  onFlip: () => void;
}

export default function BacksideLogin({ onFlip }: BacksideLoginProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-indigo-900/80 to-cyan-900/80 rounded-2xl backdrop-blur-md">
      <div className="absolute top-4 right-4">
        <button 
          onClick={onFlip}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-200"
        >
          <Icon icon="solar:refresh-bold" className="w-5 h-5" />
        </button>
      </div>
      
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center mb-6">
        <Icon icon="solar:shield-check-bold" className="w-8 h-8 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-4">Дополнительные возможности</h2>
      <p className="text-center text-white/80 mb-6">
        Здесь будет размещен дополнительный функционал системы.
      </p>
      
      <div className="grid grid-cols-2 gap-4 w-full">
        <button className="p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors duration-200 flex flex-col items-center">
          <Icon icon="solar:document-text-bold" className="w-8 h-8 text-white mb-2" />
          <span className="text-white text-sm">Документация</span>
        </button>
        <button className="p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors duration-200 flex flex-col items-center">
          <Icon icon="solar:info-circle-bold" className="w-8 h-8 text-white mb-2" />
          <span className="text-white text-sm">Справка</span>
        </button>
        <button className="p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors duration-200 flex flex-col items-center">
          <Icon icon="solar:settings-bold" className="w-8 h-8 text-white mb-2" />
          <span className="text-white text-sm">Настройки</span>
        </button>
        <button className="p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors duration-200 flex flex-col items-center">
          <Icon icon="solar:headphones-bold" className="w-8 h-8 text-white mb-2" />
          <span className="text-white text-sm">Поддержка</span>
        </button>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-white/60 text-sm">Перевернуть форму для входа в систему</p>
        <button 
          onClick={onFlip}
          className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors duration-200 flex items-center mx-auto"
        >
          <Icon icon="solar:login-3-bold" className="w-5 h-5 mr-2" />
          Перейти к форме входа
        </button>
      </div>
    </div>
  );
}
