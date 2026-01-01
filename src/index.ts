/**
 * Chatbot Widget
 *
 * A customizable React chat widget with SSE streaming, research mode,
 * and markdown rendering.
 */

// Main components
export { ChatbotWidget, default } from './ChatbotWidget';
export { ChatbotProvider, useChatbot, ChatbotContext } from './ChatbotContext';

// Hooks
export { useChatApi } from './hooks/useChatApi';

// Types
export type {
  Message,
  Source,
  ArticleContext,
  AuthState,
  RAGResponse,
  ChatbotConfig,
} from './types';

export { DEFAULT_CONFIG } from './types';
