'use client';

/**
 * AI Context Provider
 * 
 * Manages global AI chat state across the dashboard
 * Supports callbacks for auto-creation features (e.g., cohorts)
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type { AIContext as AIContextType } from '@/app/api/ai/prompts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Cohort rule structure (must match cohorts page)
export interface CohortRule {
  field: string;
  operator: string;
  value: string | number;
}

export interface CohortData {
  name: string;
  description: string;
  rules: CohortRule[];
}

interface AIContextValue {
  // Chat state
  isOpen: boolean;
  openChat: (context?: AIContextType, contextData?: Record<string, unknown>) => void;
  closeChat: () => void;
  toggleChat: () => void;

  // Current context
  currentContext: AIContextType;
  setCurrentContext: (context: AIContextType) => void;
  contextData: Record<string, unknown>;
  setContextData: (data: Record<string, unknown>) => void;

  // Messages
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Cohort creation callback
  onCohortCreate: ((data: CohortData) => Promise<void>) | null;
  setOnCohortCreate: (callback: ((data: CohortData) => Promise<void>) | null) => void;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<AIContextType>('general');
  const [contextData, setContextData] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Callback ref for cohort creation
  const cohortCallbackRef = useRef<((data: CohortData) => Promise<void>) | null>(null);

  const openChat = useCallback((context?: AIContextType, data?: Record<string, unknown>) => {
    if (context) setCurrentContext(context);
    if (data) setContextData(data);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const setOnCohortCreate = useCallback((callback: ((data: CohortData) => Promise<void>) | null) => {
    cohortCallbackRef.current = callback;
  }, []);

  const value: AIContextValue = {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    currentContext,
    setCurrentContext,
    contextData,
    setContextData,
    messages,
    addMessage,
    clearMessages,
    isLoading,
    setIsLoading,
    onCohortCreate: cohortCallbackRef.current,
    setOnCohortCreate,
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

export type { AIContextValue, ChatMessage };
