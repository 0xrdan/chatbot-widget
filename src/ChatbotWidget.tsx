/**
 * Chatbot Widget Component
 *
 * A floating chat widget with support for regular and research modes,
 * SSE streaming, source citations, and markdown rendering.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatbot } from './ChatbotContext';
import { useChatApi } from './hooks/useChatApi';
import type { Message } from './types';

// Icons (inline SVGs for zero dependencies)
const ChatIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const BeakerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ExpandIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

const CollapseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

/**
 * Format model ID to display name
 */
function formatModelName(modelId?: string): string {
  if (!modelId) return 'AI';

  const modelMap: Record<string, string> = {
    'claude-opus-4-5': 'Claude Opus 4.5',
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'claude-haiku-3-5': 'Claude Haiku 3.5',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gpt-5.1': 'GPT-5.1',
    'gpt-4o': 'GPT-4o',
  };

  for (const [key, name] of Object.entries(modelMap)) {
    if (modelId.startsWith(key)) return name;
  }

  return modelId
    .replace(/-\d{8}$/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Message bubble component
 */
function MessageBubble({
  message,
  index,
  isResearchMode,
  onGoDeeper,
  onFeedback,
  showFeedback,
  feedbackGiven,
}: {
  message: Message;
  index: number;
  isResearchMode: boolean;
  onGoDeeper?: (index: number) => void;
  onFeedback?: (index: number, vote: 'positive' | 'negative') => void;
  showFeedback: boolean;
  feedbackGiven: Set<number>;
}) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className="max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? isResearchMode
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : isResearchMode
                ? 'bg-emerald-900/40 text-gray-100 border border-emerald-800/30'
                : 'bg-gray-800 text-gray-100'
          }`}
        >
          {message.role === 'assistant' ? (
            <div className="text-sm">
              {/* Outline points */}
              {message.outline && message.outline.length > 0 && (
                <div className={`mb-3 p-2 rounded-lg ${
                  isResearchMode
                    ? 'bg-emerald-900/30 border border-emerald-500/30'
                    : 'bg-indigo-900/20 border border-indigo-500/30'
                }`}>
                  <div className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${
                    isResearchMode ? 'text-emerald-400' : 'text-indigo-400'
                  }`}>
                    <SparklesIcon />
                    <span>Key Points</span>
                  </div>
                  <ul className="space-y-1">
                    {message.outline.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-300 text-xs">
                        <span className={isResearchMode ? 'text-emerald-400' : 'text-indigo-400'}>•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Streaming indicator */}
              {message.isStreaming && message.streamingStatus && (
                <div className={`flex items-center gap-2 py-2 ${
                  isResearchMode ? 'text-emerald-400' : 'text-indigo-400'
                }`}>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs">{message.streamingStatus}</span>
                </div>
              )}

              {/* Main content */}
              {message.content && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Go Deeper button */}
              {message.mode === 'research' && message.canGoDeeper && !message.isStreaming && !message.deeperAnalysis && (
                <button
                  onClick={() => onGoDeeper?.(index)}
                  disabled={message.isLoadingDeeper}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 disabled:opacity-50"
                >
                  {message.isLoadingDeeper ? (
                    <>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" />
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <BeakerIcon />
                      <span>{message.deeperSuggestion || 'Go deeper →'}</span>
                    </>
                  )}
                </button>
              )}

              {/* Deeper analysis content */}
              {message.deeperAnalysis && (
                <div className="mt-4 pt-4 border-t border-emerald-500/30">
                  <div className="flex items-center gap-1.5 text-xs font-medium mb-2 text-emerald-400">
                    <BeakerIcon />
                    <span>Deeper Analysis</span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.deeperAnalysis}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Model info */}
          {(message.model || message.provider) && (
            <div className="flex items-center gap-2 text-xs opacity-60 mt-1 flex-wrap">
              <span>via {formatModelName(message.model) || message.provider}</span>
              {message.route && (
                <span className="px-2 py-0.5 bg-indigo-900/40 text-indigo-300 rounded">
                  {message.route}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
          <div className="mt-2 text-xs">
            <p className="text-gray-400 mb-1 font-medium">Sources:</p>
            <div className="space-y-1">
              {message.sources.map((source, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-2 border ${
                    isResearchMode
                      ? 'bg-emerald-900/20 border-emerald-800/30'
                      : 'bg-gray-800/50 border-gray-700/50'
                  }`}
                >
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-medium block mb-1 ${
                        isResearchMode
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-indigo-400 hover:text-indigo-300'
                      }`}
                    >
                      {source.title} ↗
                    </a>
                  ) : (
                    <p className="text-gray-300 font-medium mb-1">{source.title}</p>
                  )}
                  <p className="text-gray-500 text-xs line-clamp-2">{source.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {message.role === 'assistant' && showFeedback && (
          <div className="mt-2 flex items-center gap-2">
            {!feedbackGiven.has(index) ? (
              <>
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <button
                  onClick={() => onFeedback?.(index, 'positive')}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-sm"
                >
                  👍
                </button>
                <button
                  onClick={() => onFeedback?.(index, 'negative')}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-sm"
                >
                  👎
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500">Thanks for the feedback!</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Main ChatbotWidget component
 */
export function ChatbotWidget() {
  const {
    config,
    auth,
    messages,
    researchMessages,
    clearMessages,
    articleContext,
    isOpen,
    setIsOpen,
    isExpanded,
    setIsExpanded,
    isResearchMode,
    setIsResearchMode,
    isLoading,
    error,
  } = useChatbot();

  const { sendMessage, requestDeeperAnalysis } = useChatApi();

  const [input, setInput] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<Set<number>>(new Set());
  const [researchFeedbackGiven, setResearchFeedbackGiven] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMessages = isResearchMode ? researchMessages : messages;
  const currentFeedbackGiven = isResearchMode ? researchFeedbackGiven : feedbackGiven;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  }, [input, isLoading, sendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleFeedback = useCallback((index: number, vote: 'positive' | 'negative') => {
    // Submit feedback
    fetch(`${config.apiBaseUrl}${config.endpoints?.feedback}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: currentMessages[index - 1]?.content,
        response: currentMessages[index]?.content,
        voteType: vote,
      }),
    }).catch(console.error);

    if (isResearchMode) {
      setResearchFeedbackGiven(prev => new Set([...prev, index]));
    } else {
      setFeedbackGiven(prev => new Set([...prev, index]));
    }
  }, [config, currentMessages, isResearchMode]);

  const handleDownload = useCallback(() => {
    if (currentMessages.length === 0) return;

    const now = new Date();
    let markdown = `# Chat Session\n\n**Date:** ${now.toLocaleDateString()}\n\n---\n\n`;

    currentMessages.forEach((msg, i) => {
      if (msg.role === 'user') {
        markdown += `## Question ${Math.floor(i / 2) + 1}\n\n${msg.content}\n\n`;
      } else {
        markdown += `### Answer\n\n${msg.content}\n\n`;
        if (msg.deeperAnalysis) {
          markdown += `#### Deeper Analysis\n\n${msg.deeperAnalysis}\n\n`;
        }
        markdown += `---\n\n`;
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${now.toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentMessages]);

  const suggestedQuestions = isResearchMode
    ? config.suggestedQuestions?.research || [
        'What are the key takeaways from this article?',
        'Can you explain the main concepts in simpler terms?',
        'What are the practical applications?',
      ]
    : config.suggestedQuestions?.regular || [
        'What can you help me with?',
        'Tell me about your capabilities.',
        'How does this work?',
      ];

  const positionClasses = config.position === 'bottom-left'
    ? 'bottom-6 left-6'
    : 'bottom-6 right-6';

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${positionClasses} z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle chatbot"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <CloseIcon />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <ChatIcon />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-24 ${positionClasses} z-40 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden`}
            style={{
              width: isExpanded ? 'calc(100vw - 3rem)' : '24rem',
              height: '70vh',
              maxWidth: isExpanded ? '100%' : '24rem',
              maxHeight: '600px',
            }}
          >
            {/* Header */}
            <div className={`p-4 flex items-center justify-between ${
              isResearchMode
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600'
            }`}>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white/80 hover:text-white transition-colors p-1"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
              </button>

              <div className="flex items-center gap-2">
                {isResearchMode ? <BeakerIcon /> : <SparklesIcon />}
                <span className="text-white text-sm font-medium">
                  {isResearchMode ? 'Research Mode' : 'Chat'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {config.enableResearchMode && articleContext && (
                  <button
                    onClick={() => setIsResearchMode(!isResearchMode)}
                    className={`p-1 rounded transition-colors ${
                      isResearchMode ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                    title="Toggle Research Mode"
                  >
                    <BeakerIcon />
                  </button>
                )}
                {config.enableDownload && currentMessages.length > 0 && (
                  <button
                    onClick={handleDownload}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Download"
                  >
                    <DownloadIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Article context banner */}
            {isResearchMode && articleContext && (
              <div className="bg-emerald-900/50 border-b border-emerald-700/50 px-4 py-2">
                <p className="text-xs text-emerald-200">
                  📄 Discussing: <span className="font-medium">{articleContext.title}</span>
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!auth.isAuthenticated ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <p className="text-gray-400 text-sm mb-4">
                    Please log in to use the chat.
                  </p>
                  <button
                    onClick={() => config.onAuthRequired?.()}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
                  >
                    Log In
                  </button>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  {isResearchMode ? (
                    <BeakerIcon />
                  ) : (
                    <SparklesIcon />
                  )}
                  <p className="text-sm mt-3 mb-4">
                    {isResearchMode
                      ? `Ask questions about "${articleContext?.title}"`
                      : 'How can I help you today?'}
                  </p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(q)}
                        className={`block w-full text-left text-sm px-4 py-2 rounded-lg transition-colors ${
                          isResearchMode
                            ? 'bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/50'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {currentMessages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  index={index}
                  isResearchMode={isResearchMode}
                  onGoDeeper={requestDeeperAnalysis}
                  onFeedback={handleFeedback}
                  showFeedback={config.showFeedback ?? true}
                  feedbackGiven={currentFeedbackGiven}
                />
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${isResearchMode ? 'border-emerald-800/50' : 'border-gray-800'}`}>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, config.maxMessageLength || 500))}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    !auth.isAuthenticated
                      ? config.placeholders?.unauthenticated
                      : isResearchMode
                        ? config.placeholders?.research
                        : config.placeholders?.regular
                  }
                  className={`flex-1 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 placeholder-gray-500 disabled:opacity-50 ${
                    isResearchMode
                      ? 'bg-emerald-900/30 focus:ring-emerald-500'
                      : 'bg-gray-800 focus:ring-indigo-500'
                  }`}
                  disabled={isLoading || !auth.isAuthenticated}
                />
                <button
                  onClick={auth.isAuthenticated ? handleSend : () => config.onAuthRequired?.()}
                  disabled={auth.isAuthenticated ? (!input.trim() || isLoading) : false}
                  className={`text-white rounded-xl px-4 py-2 hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed ${
                    isResearchMode
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600'
                  }`}
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatbotWidget;
