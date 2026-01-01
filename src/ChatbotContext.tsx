/**
 * Chatbot Context Provider
 *
 * Provides configuration and state management for the chatbot widget.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ChatbotConfig, Message, ArticleContext, AuthState, DEFAULT_CONFIG } from './types';

interface ChatbotContextValue {
  /** Merged configuration */
  config: ChatbotConfig;
  /** Current auth state */
  auth: AuthState;
  /** Update auth state */
  setAuth: (auth: AuthState) => void;
  /** Regular chat messages */
  messages: Message[];
  /** Research mode messages */
  researchMessages: Message[];
  /** Add a message */
  addMessage: (message: Message, isResearch?: boolean) => void;
  /** Update a message at index */
  updateMessage: (index: number, updates: Partial<Message>, isResearch?: boolean) => void;
  /** Clear messages */
  clearMessages: (isResearch?: boolean) => void;
  /** Current article context */
  articleContext: ArticleContext | null;
  /** Set article context */
  setArticleContext: (context: ArticleContext | null) => void;
  /** Is widget open */
  isOpen: boolean;
  /** Toggle widget */
  setIsOpen: (open: boolean) => void;
  /** Is expanded view */
  isExpanded: boolean;
  /** Toggle expanded */
  setIsExpanded: (expanded: boolean) => void;
  /** Is research mode active */
  isResearchMode: boolean;
  /** Toggle research mode */
  setIsResearchMode: (mode: boolean) => void;
  /** Remaining quota */
  remainingQuota: number | null;
  /** Set remaining quota */
  setRemainingQuota: (quota: number | null) => void;
  /** Loading state */
  isLoading: boolean;
  /** Set loading */
  setIsLoading: (loading: boolean) => void;
  /** Error message */
  error: string | null;
  /** Set error */
  setError: (error: string | null) => void;
}

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

interface ChatbotProviderProps {
  children: React.ReactNode;
  config: ChatbotConfig;
  initialAuth?: AuthState;
}

export function ChatbotProvider({ children, config, initialAuth }: ChatbotProviderProps) {
  // Merge with defaults
  const mergedConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    endpoints: { ...DEFAULT_CONFIG.endpoints, ...config.endpoints },
    placeholders: { ...DEFAULT_CONFIG.placeholders, ...config.placeholders },
    theme: { ...config.theme },
  }), [config]);

  // State
  const [auth, setAuth] = useState<AuthState>(initialAuth || { isAuthenticated: false });
  const [messages, setMessages] = useState<Message[]>([]);
  const [researchMessages, setResearchMessages] = useState<Message[]>([]);
  const [articleContext, setArticleContext] = useState<ArticleContext | null>(
    config.articleContext || null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved messages from localStorage
  React.useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('chatbot-messages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
      const savedResearch = localStorage.getItem('chatbot-research-messages');
      if (savedResearch) {
        const parsed = JSON.parse(savedResearch);
        setResearchMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  }, []);

  // Save messages to localStorage
  React.useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot-messages', JSON.stringify(messages));
    }
  }, [messages]);

  React.useEffect(() => {
    if (researchMessages.length > 0) {
      localStorage.setItem('chatbot-research-messages', JSON.stringify(researchMessages));
    }
  }, [researchMessages]);

  const addMessage = useCallback((message: Message, isResearch = false) => {
    if (isResearch) {
      setResearchMessages(prev => [...prev, message]);
    } else {
      setMessages(prev => [...prev, message]);
    }
  }, []);

  const updateMessage = useCallback((index: number, updates: Partial<Message>, isResearch = false) => {
    const setter = isResearch ? setResearchMessages : setMessages;
    setter(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], ...updates };
      }
      return updated;
    });
  }, []);

  const clearMessages = useCallback((isResearch = false) => {
    if (isResearch) {
      setResearchMessages([]);
      localStorage.removeItem('chatbot-research-messages');
    } else {
      setMessages([]);
      localStorage.removeItem('chatbot-messages');
    }
  }, []);

  const value: ChatbotContextValue = {
    config: mergedConfig as ChatbotConfig,
    auth,
    setAuth,
    messages,
    researchMessages,
    addMessage,
    updateMessage,
    clearMessages,
    articleContext,
    setArticleContext,
    isOpen,
    setIsOpen,
    isExpanded,
    setIsExpanded,
    isResearchMode,
    setIsResearchMode,
    remainingQuota,
    setRemainingQuota,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}

export { ChatbotContext };
