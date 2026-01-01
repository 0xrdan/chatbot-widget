/**
 * Chat API Hook
 *
 * Handles API communication for chat messages.
 */

import { useCallback } from 'react';
import { useChatbot } from '../ChatbotContext';
import type { Message, RAGResponse } from '../types';

/**
 * Generate a unique client ID
 */
function getClientId(): string {
  let clientId = localStorage.getItem('chatbot-client-id');
  if (!clientId) {
    clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('chatbot-client-id', clientId);
  }
  return clientId;
}

export function useChatApi() {
  const {
    config,
    auth,
    isResearchMode,
    articleContext,
    researchMessages,
    addMessage,
    updateMessage,
    setRemainingQuota,
    setIsLoading,
    setError,
  } = useChatbot();

  /**
   * Send a standard (non-streaming) message
   */
  const sendStandardMessage = useCallback(async (question: string): Promise<void> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-ID': getClientId(),
    };

    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const response = await fetch(`${config.apiBaseUrl}${config.endpoints?.chat}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        topK: 5,
        threshold: 0.5,
        temperature: 0.3,
        maxTokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Request failed (${response.status})`);
    }

    const data: RAGResponse = await response.json();

    const assistantMessage: Message = {
      role: 'assistant',
      content: data.data.answer,
      provider: data.data.provider,
      model: data.meta?.routing?.model,
      timestamp: new Date(),
      sources: data.data.sources,
      confidence: data.data.confidence,
      mode: 'regular',
      route: data.meta?.routing?.route,
      outline: data.data.hybridSynthesis?.outline,
    };

    addMessage(assistantMessage, false);

    if (data.meta?.remainingQuota !== undefined) {
      setRemainingQuota(data.meta.remainingQuota);
    }
  }, [config, auth, addMessage, setRemainingQuota]);

  /**
   * Send a streaming message (Research Mode)
   */
  const sendStreamingMessage = useCallback(async (question: string): Promise<void> => {
    if (!articleContext) {
      throw new Error('Article context required for Research Mode');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-ID': getClientId(),
    };

    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    // Find existing sessionId for follow-ups
    const existingSessionId = researchMessages
      .filter(m => m.role === 'assistant' && m.sessionId)
      .map(m => m.sessionId)
      .pop();

    const isFollowUp = !!existingSessionId;

    // Add placeholder message
    const placeholderMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      mode: 'research',
      isStreaming: true,
      streamingStatus: isFollowUp ? 'Generating response...' : 'Analyzing article...',
    };

    addMessage(placeholderMessage, true);
    const messageIndex = researchMessages.length; // Index of the placeholder

    // Build request body
    const requestBody: Record<string, any> = {
      question,
      sessionId: existingSessionId,
    };

    if (!isFollowUp) {
      requestBody.articleContext = {
        slug: articleContext.slug,
        title: articleContext.title,
        content: articleContext.content,
        abstractOneParagraph: articleContext.abstractOneParagraph,
        researchArea: articleContext.researchArea,
        tags: articleContext.tags,
      };
    }

    return new Promise((resolve, reject) => {
      fetch(`${config.apiBaseUrl}${config.endpoints?.stream}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            const dataMatch = text.match(/data:\s*({.*})/);
            if (dataMatch) {
              try {
                const errorData = JSON.parse(dataMatch[1]);
                throw new Error(errorData.message || 'Stream failed');
              } catch (e) {
                if (e instanceof Error && e.message !== 'Stream failed') throw e;
              }
            }
            throw new Error(`Server error (${response.status})`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('Stream not available');

          const decoder = new TextDecoder();
          let eventBuffer = '';
          let receivedDone = false;

          const processLine = (line: string) => {
            if (line.startsWith('event: ')) {
              eventBuffer = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              const eventType = eventBuffer;
              try {
                const data = JSON.parse(line.substring(6));

                switch (eventType) {
                  case 'outline':
                    updateMessage(messageIndex, {
                      outline: data.outline || [],
                      model: data.model || '',
                      streamingStatus: 'Preparing detailed response...',
                    }, true);
                    break;

                  case 'status':
                    updateMessage(messageIndex, {
                      streamingStatus: data.message || 'Generating...',
                    }, true);
                    break;

                  case 'answer':
                    updateMessage(messageIndex, {
                      content: data.answer || '',
                      model: data.model,
                      isStreaming: false,
                      streamingStatus: undefined,
                    }, true);
                    break;

                  case 'done':
                    receivedDone = true;
                    updateMessage(messageIndex, {
                      isStreaming: false,
                      streamingStatus: undefined,
                      confidence: 85,
                      route: 'research',
                      sessionId: data.sessionId,
                      canGoDeeper: data.canGoDeeper,
                      deeperSuggestion: data.deeperSuggestion,
                    }, true);
                    if (data.remainingQuota !== undefined) {
                      setRemainingQuota(data.remainingQuota);
                    }
                    resolve();
                    break;

                  case 'error':
                    reject(new Error(data.message || 'Stream error'));
                    break;
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
              eventBuffer = '';
            }
          };

          const readStream = async () => {
            let partialLine = '';
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  if (!receivedDone) {
                    updateMessage(messageIndex, { isStreaming: false }, true);
                  }
                  break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const text = partialLine + chunk;
                const lines = text.split('\n');
                partialLine = lines.pop() || '';

                for (const line of lines) {
                  if (line.trim()) processLine(line.trim());
                }
              }
            } catch (error) {
              updateMessage(messageIndex, { isStreaming: false }, true);
              reject(error);
            }
          };

          readStream();
        })
        .catch(reject);
    });
  }, [config, auth, articleContext, researchMessages, addMessage, updateMessage, setRemainingQuota]);

  /**
   * Request deeper analysis for a message
   */
  const requestDeeperAnalysis = useCallback(async (messageIndex: number): Promise<void> => {
    const messages = researchMessages;
    const message = messages[messageIndex];
    if (!message?.sessionId || !auth.token) return;

    updateMessage(messageIndex, {
      isLoadingDeeper: true,
      canGoDeeper: false,
    }, true);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    };

    return new Promise((resolve, reject) => {
      fetch(`${config.apiBaseUrl}${config.endpoints?.deeper}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: message.sessionId }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Request failed (${response.status})`);

          const reader = response.body?.getReader();
          if (!reader) throw new Error('Stream not available');

          const decoder = new TextDecoder();
          let eventBuffer = '';

          const processLine = (line: string) => {
            if (line.startsWith('event: ')) {
              eventBuffer = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              const eventType = eventBuffer;
              try {
                const data = JSON.parse(line.substring(6));

                if (eventType === 'analysis') {
                  updateMessage(messageIndex, {
                    deeperAnalysis: data.analysis || '',
                    isLoadingDeeper: false,
                  }, true);
                } else if (eventType === 'done') {
                  updateMessage(messageIndex, { isLoadingDeeper: false }, true);
                  if (data.remainingQuota !== undefined) {
                    setRemainingQuota(data.remainingQuota);
                  }
                  resolve();
                } else if (eventType === 'error') {
                  updateMessage(messageIndex, {
                    isLoadingDeeper: false,
                    canGoDeeper: true,
                  }, true);
                  reject(new Error(data.message));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
              eventBuffer = '';
            }
          };

          const readStream = async () => {
            let partialLine = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const text = partialLine + chunk;
              const lines = text.split('\n');
              partialLine = lines.pop() || '';

              for (const line of lines) {
                if (line.trim()) processLine(line.trim());
              }
            }
          };

          readStream();
        })
        .catch((err) => {
          updateMessage(messageIndex, {
            isLoadingDeeper: false,
            canGoDeeper: true,
          }, true);
          reject(err);
        });
    });
  }, [config, auth, researchMessages, updateMessage, setRemainingQuota]);

  /**
   * Send a message (auto-selects standard or streaming based on mode)
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return;

    // Check auth
    if (!auth.isAuthenticated) {
      config.onAuthRequired?.();
      return;
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      mode: isResearchMode ? 'research' : 'regular',
    };

    addMessage(userMessage, isResearchMode);
    setIsLoading(true);
    setError(null);

    try {
      if (isResearchMode && articleContext) {
        await sendStreamingMessage(content);
      } else {
        await sendStandardMessage(content);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      config.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    auth,
    config,
    isResearchMode,
    articleContext,
    addMessage,
    setIsLoading,
    setError,
    sendStandardMessage,
    sendStreamingMessage,
  ]);

  return {
    sendMessage,
    sendStandardMessage,
    sendStreamingMessage,
    requestDeeperAnalysis,
  };
}
