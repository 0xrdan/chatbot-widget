/**
 * Chatbot Widget - Type Definitions
 */

/**
 * Message in the conversation
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Provider that generated this response */
  provider?: string;
  /** Model ID for display */
  model?: string;
  /** Source citations */
  sources?: Source[];
  /** Response confidence score */
  confidence?: number;
  /** Chat mode that generated this message */
  mode?: 'regular' | 'research';
  /** Routing information */
  route?: string;
  /** Quick outline points (hybrid synthesis) */
  outline?: string[];
  /** SSE streaming state */
  isStreaming?: boolean;
  streamingStatus?: string;
  /** Staged response: "Go Deeper" functionality */
  sessionId?: string;
  canGoDeeper?: boolean;
  deeperSuggestion?: string;
  deeperAnalysis?: string;
  isLoadingDeeper?: boolean;
}

/**
 * Source citation
 */
export interface Source {
  title: string;
  url?: string;
  excerpt: string;
  score: number;
}

/**
 * Article context for Research Mode
 */
export interface ArticleContext {
  slug: string;
  title: string;
  content: string;
  abstractOneParagraph?: string;
  researchArea?: string;
  tags?: string[];
}

/**
 * User authentication state
 */
export interface AuthState {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** JWT token for API calls */
  token?: string;
  /** User information */
  user?: {
    id: number;
    email: string;
    [key: string]: any;
  };
  /** Subscription tier */
  tier?: 'free' | 'premium' | 'research' | 'demo';
}

/**
 * API response from RAG query
 */
export interface RAGResponse {
  success: boolean;
  data: {
    answer: string;
    sources: Source[];
    confidence: number;
    provider?: string;
    retrievalStats?: {
      chunksRetrieved: number;
      avgSimilarity: number;
      queryTime: string;
    };
    hybridSynthesis?: {
      outline: string[];
      outlineModel: string;
      parallelSavingsMs: number;
    };
  };
  meta: {
    remainingQuota?: number;
    resetTime?: string;
    routing?: {
      route: string;
      model: string;
      confidence: number;
      bypassed: boolean;
    };
  };
}

/**
 * Chatbot widget configuration
 */
export interface ChatbotConfig {
  /** Base URL for API calls */
  apiBaseUrl: string;

  /** API endpoints (relative to apiBaseUrl) */
  endpoints?: {
    /** Standard chat endpoint */
    chat?: string;
    /** SSE streaming endpoint */
    stream?: string;
    /** Status check endpoint */
    status?: string;
    /** Feedback endpoint */
    feedback?: string;
    /** Go deeper endpoint */
    deeper?: string;
    /** Session compact endpoint */
    compact?: string;
  };

  /** Authentication configuration */
  auth?: AuthState;

  /** Enable Research Mode (article-focused chat) */
  enableResearchMode?: boolean;

  /** Article context for Research Mode */
  articleContext?: ArticleContext;

  /** Custom placeholder text */
  placeholders?: {
    regular?: string;
    research?: string;
    unauthenticated?: string;
  };

  /** Custom suggested questions */
  suggestedQuestions?: {
    regular?: string[];
    research?: string[];
  };

  /** Theme customization */
  theme?: {
    /** Primary accent color (Tailwind class or hex) */
    primaryColor?: string;
    /** Research mode accent color */
    researchColor?: string;
    /** Background color */
    backgroundColor?: string;
  };

  /** Callback when user needs to authenticate */
  onAuthRequired?: () => void;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;

  /** Maximum message length */
  maxMessageLength?: number;

  /** Show source citations */
  showSources?: boolean;

  /** Show response feedback buttons */
  showFeedback?: boolean;

  /** Show model/provider info */
  showModelInfo?: boolean;

  /** Enable download as markdown */
  enableDownload?: boolean;

  /** Position of the widget */
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<ChatbotConfig> = {
  endpoints: {
    chat: '/api/rag/ask',
    stream: '/api/rag/query-stream',
    status: '/api/chatbot/status',
    feedback: '/api/chatbot/response-feedback',
    deeper: '/api/rag/query-stream/deeper',
    compact: '/api/rag/session',
  },
  enableResearchMode: false,
  placeholders: {
    regular: 'Type your message...',
    research: 'Ask about this article...',
    unauthenticated: 'Log in to chat...',
  },
  maxMessageLength: 500,
  showSources: true,
  showFeedback: true,
  showModelInfo: true,
  enableDownload: true,
  position: 'bottom-right',
};
