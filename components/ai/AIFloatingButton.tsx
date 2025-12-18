'use client';

/**
 * AI Floating Button Component
 * 
 * Trigger button for opening AI chat with Navlens theme styling
 */

import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useAI } from '@/context/AIProvider';

interface AIFloatingButtonProps {
  className?: string;
}

export function AIFloatingButton({ className = '' }: AIFloatingButtonProps) {
  const { toggleChat, isOpen } = useAI();

  return (
    <button
      onClick={toggleChat}
      className={`
        group relative flex items-center justify-center
        w-14 h-14 rounded-full
        bg-gradient-to-r from-cyan-500 to-blue-500
        hover:from-navlens-electric-blue hover:to-navlens-accent
        shadow-lg hover:shadow-glow
        transition-all duration-300 ease-out
        transform hover:scale-110 active:scale-95
        ${isOpen ? 'rotate-45' : ''}
        ${className}
      `}
      title="Ask Navlens AI"
      aria-label="Open AI Assistant"
    >
      {/* Glow effect */}
      <span className="absolute inset-0 rounded-full bg-navlens-accent/30 blur-md group-hover:blur-lg transition-all duration-300" />
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-navlens-accent/20 animate-ping" />
      
      {/* Icon */}
      <SparklesIcon 
        className={`
          relative w-7 h-7 text-white
          transition-transform duration-300
          ${isOpen ? 'rotate-90' : 'group-hover:rotate-12'}
        `}
      />
    </button>
  );
}

export default AIFloatingButton;
