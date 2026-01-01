# Chatbot Widget

A customizable React chat widget with SSE streaming, research mode, and markdown rendering.

> *This is a standalone extraction from my production portfolio site. See it in action at [danmonteiro.com](https://www.danmonteiro.com).*

---

## The Problem

You're adding a chat interface but:

- **UI from scratch is tedious** — styling, animations, responsive design
- **Streaming is complex** — SSE handling, partial updates, error recovery
- **Research mode needs context** — article-aware conversations require state management
- **Features pile up** — markdown, sources, feedback, download...

## The Solution

Chatbot Widget provides:

- **Drop-in React component** — floating button + chat window
- **SSE streaming built-in** — real-time responses with status updates
- **Research Mode** — article-focused conversations with "Go Deeper" analysis
- **Full-featured** — markdown, sources, feedback, download, expand/collapse

```tsx
import { ChatbotProvider, ChatbotWidget } from '@danmonteiro/chatbot-widget';

function App() {
  return (
    <ChatbotProvider
      config={{
        apiBaseUrl: 'https://api.example.com',
        auth: { isAuthenticated: true, token: 'jwt...' },
        enableResearchMode: true,
      }}
    >
      <ChatbotWidget />
    </ChatbotProvider>
  );
}
```

## Features

| Feature | Description |
|---------|-------------|
| **SSE Streaming** | Real-time response streaming with status indicators |
| **Research Mode** | Article-aware conversations with deeper analysis |
| **Go Deeper** | Staged responses - get more detail on demand |
| **Markdown** | Full GFM support via react-markdown |
| **Source Citations** | Display sources with links and excerpts |
| **Feedback** | 👍/👎 response feedback collection |
| **Download** | Export conversation as markdown file |
| **Expand/Collapse** | Full-width or compact view |
| **Customizable** | Theming, placeholders, suggested questions |

---

## Quick Start

### 1. Install

```bash
npm install @danmonteiro/chatbot-widget
```

### 2. Add Provider and Widget

```tsx
import { ChatbotProvider, ChatbotWidget } from '@danmonteiro/chatbot-widget';

function App() {
  return (
    <ChatbotProvider
      config={{
        apiBaseUrl: 'https://your-api.com',
        auth: {
          isAuthenticated: true,
          token: 'your-jwt-token',
        },
        onAuthRequired: () => {
          // Show login modal
        },
      }}
    >
      <YourApp />
      <ChatbotWidget />
    </ChatbotProvider>
  );
}
```

### 3. Implement API Endpoints

The widget expects these endpoints (customizable):

```typescript
// Standard chat
POST /api/rag/ask
Body: { question, topK, threshold, temperature, maxTokens }
Response: { success, data: { answer, sources, confidence, provider } }

// SSE streaming (Research Mode)
POST /api/rag/query-stream
Body: { question, articleContext?, sessionId? }
Events: connected, outline, status, answer, done, error

// Go Deeper
POST /api/rag/query-stream/deeper
Body: { sessionId }
Events: analysis, done, error
```

---

## Configuration

### ChatbotConfig

```typescript
interface ChatbotConfig {
  // Required
  apiBaseUrl: string;

  // Authentication
  auth?: {
    isAuthenticated: boolean;
    token?: string;
    user?: { id: number; email: string };
    tier?: 'free' | 'premium' | 'research';
  };

  // Endpoints (relative to apiBaseUrl)
  endpoints?: {
    chat?: string;      // Default: '/api/rag/ask'
    stream?: string;    // Default: '/api/rag/query-stream'
    feedback?: string;  // Default: '/api/chatbot/response-feedback'
    deeper?: string;    // Default: '/api/rag/query-stream/deeper'
  };

  // Features
  enableResearchMode?: boolean;
  showSources?: boolean;
  showFeedback?: boolean;
  showModelInfo?: boolean;
  enableDownload?: boolean;

  // Research Mode context
  articleContext?: {
    slug: string;
    title: string;
    content: string;
  };

  // Customization
  placeholders?: {
    regular?: string;
    research?: string;
    unauthenticated?: string;
  };

  suggestedQuestions?: {
    regular?: string[];
    research?: string[];
  };

  // Callbacks
  onAuthRequired?: () => void;
  onError?: (error: Error) => void;

  // Layout
  position?: 'bottom-right' | 'bottom-left';
  maxMessageLength?: number;
}
```

---

## Research Mode

Research Mode enables article-focused conversations with deeper analysis capabilities.

### Enable Research Mode

```tsx
<ChatbotProvider
  config={{
    apiBaseUrl: 'https://api.example.com',
    enableResearchMode: true,
    articleContext: {
      slug: 'understanding-rag',
      title: 'Understanding RAG Architecture',
      content: 'Full article content here...',
    },
  }}
>
  <ChatbotWidget />
</ChatbotProvider>
```

### SSE Event Flow

```
1. User sends question
2. Server sends: event: connected
3. Server sends: event: outline (quick key points)
4. Server sends: event: status (progress updates)
5. Server sends: event: answer (full response)
6. Server sends: event: done (with sessionId, canGoDeeper)
```

### Go Deeper

When `canGoDeeper: true` in the done event, users see a "Go Deeper" button. Clicking it:

1. Calls the deeper endpoint with sessionId
2. Streams additional analysis
3. Appends to the original message

---

## Hooks

### useChatbot

Access the chatbot context anywhere:

```tsx
import { useChatbot } from '@danmonteiro/chatbot-widget';

function MyComponent() {
  const {
    isOpen,
    setIsOpen,
    isResearchMode,
    messages,
    clearMessages,
  } = useChatbot();

  return (
    <button onClick={() => setIsOpen(true)}>
      Open Chat ({messages.length} messages)
    </button>
  );
}
```

### useChatApi

Direct API access:

```tsx
import { useChatApi } from '@danmonteiro/chatbot-widget';

function MyComponent() {
  const { sendMessage, requestDeeperAnalysis } = useChatApi();

  return (
    <button onClick={() => sendMessage('Hello!')}>
      Send Message
    </button>
  );
}
```

---

## Styling

The widget uses Tailwind-style utility classes. For custom styling:

1. **Override CSS variables** (coming soon)
2. **Wrap with custom styles**
3. **Fork and modify** the component

---

## Project Structure

```
chatbot-widget/
├── src/
│   ├── index.ts           # Exports
│   ├── types.ts           # Type definitions
│   ├── ChatbotContext.tsx # Provider and context
│   ├── ChatbotWidget.tsx  # Main component
│   └── hooks/
│       └── useChatApi.ts  # API communication hook
├── package.json
└── README.md
```

---

## Part of the Context Continuity Stack

This repo is the **user-facing layer** in a broader approach to **context continuity** — giving AI systems the right context at the right time.

| Layer | Role | This Repo |
|-------|------|-----------|
| **Intra-session** | **Short-term memory (4-hr cache)** | **chatbot-widget** |
| **Document-scoped** | **Injected article context** | **chatbot-widget** |
| **Progressive** | **Go Deeper staged responses** | **chatbot-widget** |
| **Exportable** | **Conversation download** | **chatbot-widget** |
| Retrieved | Long-term semantic memory | — |

The widget handles **ephemeral memory** (session cache), **scoped context** (Research Mode), **progressive disclosure** (Go Deeper), and **user-controlled persistence** (download). Combined with RAG for long-term retrieval, it creates seamless context continuity.

**Related repos:**
- [rag-pipeline](https://github.com/0xrdan/rag-pipeline) — The RAG backend for semantic retrieval
- [mcp-rag-server](https://github.com/0xrdan/mcp-rag-server) — RAG as MCP tools
- [ai-orchestrator](https://github.com/0xrdan/ai-orchestrator) — Complexity-based model routing

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/new-feature`)
3. Make changes with semantic commits
4. Open a PR with clear description

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with [Claude Code](https://claude.ai/code).

```
Co-Authored-By: Claude <noreply@anthropic.com>
```
