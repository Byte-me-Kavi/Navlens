'use client';

/**
 * AI Chat Component - Sidebar Version
 * 
 * Right-side sliding sidebar chat interface with markdown rendering
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAI } from '@/context/AIProvider';
import { getQuickPrompts, type AIContext as AIContextType } from '@/app/api/ai/prompts';

interface AIChatProps {
  onClose?: () => void;
}

// Simple markdown-like text formatter
function FormattedMessage({ content }: { content: string }) {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        // Code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const codeContent = part.slice(3, -3);
          const [lang, ...lines] = codeContent.split('\n');
          const code = lines.join('\n').trim();
          return (
            <div key={i} className="rounded-lg overflow-hidden bg-gray-900 my-2">
              {lang && (
                <div className="px-3 py-1 text-xs text-gray-400 bg-gray-800 border-b border-gray-700">
                  {lang}
                </div>
              )}
              <pre className="p-3 text-sm text-gray-100 overflow-x-auto">
                <code>{code || lang}</code>
              </pre>
            </div>
          );
        }
        
        // Regular text - process inline formatting
        return (
          <div key={i} className="text-sm leading-relaxed">
            {part.split('\n').map((line, lineIdx) => {
              // Empty line
              if (!line.trim()) return <div key={lineIdx} className="h-2" />;
              
              // Headers
              if (line.startsWith('### ')) {
                return <h4 key={lineIdx} className="font-semibold text-gray-900 mt-3 mb-1">{line.slice(4)}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lineIdx} className="font-bold text-gray-900 mt-4 mb-2 text-base">{line.slice(3)}</h3>;
              }
              if (line.startsWith('# ')) {
                return <h2 key={lineIdx} className="font-bold text-gray-900 mt-4 mb-2 text-lg">{line.slice(2)}</h2>;
              }
              
              // Bullet points
              if (line.match(/^[\s]*[-•*]\s/)) {
                const indent = line.match(/^[\s]*/)?.[0].length || 0;
                const text = line.replace(/^[\s]*[-•*]\s/, '');
                return (
                  <div key={lineIdx} className="flex gap-2" style={{ marginLeft: indent * 4 }}>
                    <span className="text-cyan-500 flex-shrink-0">•</span>
                    <span>{formatInlineText(text)}</span>
                  </div>
                );
              }
              
              // Numbered lists
              if (line.match(/^[\s]*\d+\.\s/)) {
                const match = line.match(/^([\s]*)(\d+)\.\s(.*)$/);
                if (match) {
                  const [, indent, num, text] = match;
                  return (
                    <div key={lineIdx} className="flex gap-2" style={{ marginLeft: (indent?.length || 0) * 4 }}>
                      <span className="text-cyan-500 flex-shrink-0 font-medium">{num}.</span>
                      <span>{formatInlineText(text)}</span>
                    </div>
                  );
                }
              }
              
              // Regular paragraph
              return <p key={lineIdx} className="mb-1">{formatInlineText(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// Format inline text (bold, italic, code, links)
function formatInlineText(text: string): React.ReactNode {
  // Split by inline code first
  const parts = text.split(/(`[^`]+`)/g);
  
  return parts.map((part, i) => {
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-gray-100 text-cyan-700 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // Bold
    let result: React.ReactNode = part;
    if (part.includes('**')) {
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      result = boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={j} className="font-semibold">{bp.slice(2, -2)}</strong>;
        }
        return bp;
      });
    }
    
    return <span key={i}>{result}</span>;
  });
}

export function AIChat({ onClose }: AIChatProps) {
  const {
    isOpen,
    closeChat,
    currentContext,
    contextData,
    messages,
    addMessage,
    clearMessages,
    isLoading,
    setIsLoading,
    onCohortCreate,
  } = useAI();

  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creatingCohort, setCreatingCohort] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Extract cohort data from AI response using regex - more robust than JSON parsing
  const parseCohortJSON = (content: string): { name: string; description: string; rules: { field: string; operator: string; value: string | number }[] } | null => {
    try {
      // Extract name
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
      if (!nameMatch) return null;
      
      // Extract description
      const descMatch = content.match(/"description"\s*:\s*"([^"]+)"/);
      
      // Extract rules - find all field/operator/value patterns
      const rules: { field: string; operator: string; value: string | number }[] = [];
      
      // Match rule patterns - handles both quoted and unquoted values
      const rulePattern = /"field"\s*:\s*"([^"]+)"[^}]*?"operator"\s*:\s*"([^"]+)"[^}]*?["']?value["']?\s*:\s*["']?([^"',}\]]+)["']?/g;
      let match;
      while ((match = rulePattern.exec(content)) !== null) {
        const field = match[1];
        const operator = match[2];
        let value: string | number = match[3].trim().replace(/["']/g, '');
        
        // Convert to number if it looks like one
        if (/^\d+$/.test(value)) {
          value = parseInt(value, 10);
        }
        
        rules.push({ field, operator, value });
      }
      
      if (rules.length === 0) return null;
      
      const result = {
        name: nameMatch[1],
        description: descMatch ? descMatch[1] : 'AI-generated cohort',
        rules
      };
      
      console.log('✅ Extracted cohort data:', result);
      return result;
    } catch (e) {
      console.log('❌ Extraction failed:', e);
    }
    return null;
  };

  // Handle cohort creation from AI response
  const handleCreateCohort = async (content: string) => {
    const cohortData = parseCohortJSON(content);
    if (!cohortData || !onCohortCreate) return;
    
    setCreatingCohort(true);
    try {
      await onCohortCreate(cohortData);
      addMessage({ role: 'assistant', content: `✅ Cohort "${cohortData.name}" created successfully!` });
      closeChat();
    } catch (error) {
      addMessage({ role: 'assistant', content: `❌ Failed to create cohort: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setCreatingCohort(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);


  const handleClose = useCallback(() => {
    closeChat();
    onClose?.();
  }, [closeChat, onClose]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = messageText.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: currentContext,
          contextData,
          history,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      }

      // Add final message
      setStreamingContent('');
      addMessage({ role: 'assistant', content: fullContent || 'No response generated.' });
    } catch (error) {
      console.error('AI Chat error:', error);
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, currentContext, contextData, addMessage, setIsLoading]);

  // Auto-send message when contextData has autoMessage (for validation errors)
  const autoMessageSentRef = useRef<string | null>(null);
  useEffect(() => {
    const autoMessage = contextData?.autoMessage as string | undefined;
    if (isOpen && autoMessage && autoMessageSentRef.current !== autoMessage) {
      autoMessageSentRef.current = autoMessage;
      // Small delay to ensure chat is ready
      setTimeout(() => {
        sendMessage(autoMessage);
      }, 300);
    }
  }, [isOpen, contextData, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = getQuickPrompts(currentContext);

  const getContextLabel = (ctx: AIContextType): string => {
    const labels: Record<AIContextType, string> = {
      session: 'Session Analysis',
      heatmap: 'Heatmap Analysis',
      experiment: 'A/B Test Insights',
      form: 'Form Analytics',
      feedback: 'Feedback Analysis',
      dashboard: 'Dashboard Intelligence',
      cohort: 'Cohort Creator',
      general: 'General Assistant',
    };
    return labels[ctx] || 'AI Assistant';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Navlens AI</h2>
              <p className="text-xs text-gray-500">{getContextLabel(currentContext)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearMessages}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear chat"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message if no messages */}
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-6">
              <div className="inline-flex p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 mb-3">
                <SparklesIcon className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                Hi! I&apos;m your AI assistant
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Ask me anything about your analytics
              </p>
              
              {/* Quick prompts */}
              <div className="space-y-2">
                {quickPrompts.slice(0, 4).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(prompt.prompt)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  group relative max-w-[90%] px-4 py-3 rounded-2xl
                  ${message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md'
                    : 'bg-gray-50 text-gray-800 rounded-bl-md border border-gray-200'
                  }
                `}
              >
                {message.role === 'user' ? (
                  <div className="text-sm">{message.content}</div>
                ) : (
                  <FormattedMessage content={message.content} />
                )}
                
                {/* Copy button for assistant messages */}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="absolute -bottom-6 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1"
                    title="Copy to clipboard"
                  >
                    {copiedId === message.id ? (
                      <>
                        <CheckIcon className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <ClipboardIcon className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}

                {/* Create Cohort button for cohort context with valid JSON */}
                {(() => {
                  if (message.role === 'assistant') {
                    const jsonData = parseCohortJSON(message.content);
                    console.log('🔍 Button check:', { context: currentContext, hasJson: !!jsonData, hasCallback: !!onCohortCreate });
                    if (currentContext === 'cohort' && jsonData && onCohortCreate) {
                      return (
                        <button
                          onClick={() => handleCreateCohort(message.content)}
                          disabled={creatingCohort}
                          className="mt-3 w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {creatingCohort ? (
                            <>Creating...</>
                          ) : (
                            <>
                              <SparklesIcon className="w-4 h-4" />
                              Create This Cohort
                            </>
                          )}
                        </button>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[90%] px-4 py-3 rounded-2xl bg-gray-50 text-gray-800 rounded-bl-md border border-gray-200">
                <FormattedMessage content={streamingContent} />
                <span className="inline-block w-2 h-4 ml-1 bg-cyan-500 animate-pulse rounded-sm" />
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-gray-50 rounded-bl-md border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Navlens AI..."
                rows={1}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                style={{ minHeight: '48px', maxHeight: '100px' }}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-400 text-center">
            Powered by Llama 3.3 70B
          </p>
        </div>
      </div>
    </>
  );
}

export default AIChat;
