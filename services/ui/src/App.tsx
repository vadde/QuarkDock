import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { InputArea } from './components/InputArea';
import { TraceDrawer } from './components/TraceDrawer';
import { ModelModal } from './components/ModelModal';
import { ScrollNavigation } from './components/ScrollNavigation';
import { Message, ModelDetail, Session, TraceMetric } from './types/chat';

const STORAGE_KEY = 'quarkdock_chat_sessions_v2';

const createDefaultSession = (): Session => ({
  id: `session-${Date.now()}`,
  title: 'Welcome Session',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to **QuarkDock**.\n\nI am your local model accelerated directly by your host **Apple Silicon Metal GPU** on port `11434` with real-time **Langfuse** tracing on port `3001`.\n\nHow can I help you today?',
      timestamp: Date.now(),
    },
  ],
});

export const App: React.FC = () => {
  const [models, setModels] = useState<ModelDetail[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('qwen2.5:7b');

  // Multi-session state with localStorage persistence
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to restore chat sessions from localStorage:', e);
    }
    return [createDefaultSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || 'session-default');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [latestMetric, setLatestMetric] = useState<TraceMetric | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Quantum Navigation & Scroll Physics State
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(100);
  const isUserScrolledUpRef = useRef(false);

  // Active session and its messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  }, [sessions]);

  // Viewport scroll physics tracker
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    const distanceToBottom = maxScroll - scrollTop;

    // Spatial depth percentage (0 - 100%)
    const progress = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))) : 100;
    setScrollProgress(progress);

    // Show Apex (Top) button when scrolled down past 250px
    setShowScrollTop(scrollTop > 250);

    // Bottom threshold: if within 75px, user is anchored to bottom
    const isNearBottom = distanceToBottom < 75;
    setShowScrollBottom(!isNearBottom);

    if (isNearBottom) {
      setIsUserScrolledUp(false);
      isUserScrolledUpRef.current = false;
    } else {
      // User has intentionally scrolled up to read earlier content
      setIsUserScrolledUp(true);
      isUserScrolledUpRef.current = true;
    }
  }, []);

  // Teleport smoothly to Apex (Top)
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // Teleport smoothly to Nadir (Bottom) and re-engage auto-scroll anchor
  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    isUserScrolledUpRef.current = false;
    setShowScrollBottom(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Auto-scroll anchor during streaming: ONLY pins to bottom if user has NOT scrolled up!
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        requestAnimationFrame(() => {
          if (container && !isUserScrolledUpRef.current) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    }
  }, [messages]);

  // When switching sessions, smoothly anchor to bottom of new conversation
  useEffect(() => {
    setIsUserScrolledUp(false);
    isUserScrolledUpRef.current = false;
    setShowScrollBottom(false);
    setShowScrollTop(false);
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 60);
  }, [activeSessionId]);

  // Fetch available models from local API
  const refreshModels = () => {
    fetch('/api/v1/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.models && data.models.length > 0) {
          setModels(data.models);
          if (!data.models.some((m: ModelDetail) => m.name === currentModel)) {
            setCurrentModel(data.default_model || data.models[0].name);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshModels();
  }, []);

  const handleNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setIsUserScrolledUp(false);
    isUserScrolledUpRef.current = false;
    setShowScrollBottom(false);
    setShowScrollTop(false);

    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'New session started. How can I assist you?',
          timestamp: Date.now(),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fallback = createDefaultSession();
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    updateActiveSessionMessages((prev) =>
      prev.map((msg, i) => (i === prev.length - 1 ? { ...msg, isStreaming: false } : msg))
    );
  };

  const updateActiveSessionMessages = (updater: (prev: Message[]) => Message[]) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const updatedMessages = updater(session.messages);
          return {
            ...session,
            updatedAt: Date.now(),
            messages: updatedMessages,
          };
        }
        return session;
      })
    );
  };

  const handleFeedback = async (traceId: string, value: number) => {
    updateActiveSessionMessages((prev) =>
      prev.map((m) =>
        m.traceId === traceId ? { ...m, feedback: value > 0 ? 'positive' : 'negative' } : m
      )
    );

    try {
      await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trace_id: traceId, value }),
      });
    } catch (e) {
      console.warn('Feedback submission error:', e);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (isStreaming) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    // Update session title dynamically from first user message if it's default
    const shouldUpdateTitle = activeSession.title === 'New Conversation' || activeSession.title === 'Welcome Session';
    const newTitle = shouldUpdateTitle ? text.slice(0, 28) + (text.length > 28 ? '...' : '') : activeSession.title;

    setSessions((prevSessions) =>
      prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...s.messages, userMessage, initialAssistantMessage],
          };
        }
        return s;
      })
    );

    setIsStreaming(true);
    setIsUserScrolledUp(false);
    isUserScrolledUpRef.current = false;
    setShowScrollBottom(false);

    // Smoothly scroll down so prompt is visible
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 40);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const apiMessages = [...messages, userMessage]
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: currentModel,
          messages: apiMessages,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: Failed to connect to streaming endpoint`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let currentTraceId = '';
      let currentTraceUrl = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (eventType === 'trace') {
            try {
              const traceData = JSON.parse(dataStr);
              currentTraceId = traceData.trace_id;
              currentTraceUrl = traceData.url;
              updateActiveSessionMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, traceId: currentTraceId, traceUrl: currentTraceUrl }
                    : msg
                )
              );
            } catch (e) {
              console.error('Failed to parse trace event', e);
            }
          } else if (eventType === 'token') {
            try {
              const tokenData = JSON.parse(dataStr);
              accumulatedText += tokenData.text;
              updateActiveSessionMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
                )
              );
            } catch (e) {
              console.error('Failed to parse token event', e);
            }
          } else if (eventType === 'done') {
            try {
              const doneData = JSON.parse(dataStr);
              const durationMs = doneData.duration_ms || 1000;
              const totalTokens = doneData.total_tokens || 1;
              const tokensPerSec = Math.round(totalTokens / (durationMs / 1000));

              const metric: TraceMetric = {
                traceId: currentTraceId || doneData.trace_id,
                traceUrl: currentTraceUrl,
                model: doneData.model || currentModel,
                totalTokens,
                durationMs,
                tokensPerSec,
              };

              setLatestMetric(metric);
              updateActiveSessionMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        isStreaming: false,
                        durationMs,
                        tokens: totalTokens,
                        traceId: metric.traceId,
                        traceUrl: metric.traceUrl,
                      }
                    : msg
                )
              );
            } catch (e) {
              console.error('Failed to parse done event', e);
            }
          } else if (eventType === 'error') {
            accumulatedText += `\n\n[Error: ${dataStr}]`;
            updateActiveSessionMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: accumulatedText, isStreaming: false }
                  : msg
              )
            );
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
      } else {
        updateActiveSessionMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `${msg.content}\n\n*[Connection interrupted. Please verify backend on port 8002.]*`,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="app-container">
      {/* Collapsible Left Sidebar with Persistent Sessions */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Interface */}
      <div className="chat-main">
        <Header
          models={models}
          currentModel={currentModel}
          onSelectModel={setCurrentModel}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          isDrawerOpen={isDrawerOpen}
          isStreaming={isStreaming}
        />

        {/* Message Stream */}
        <div
          className="message-stream"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} onFeedback={handleFeedback} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quantum Viewport Navigation HUD (Year 2500 Vision) */}
        <ScrollNavigation
          showScrollTop={showScrollTop}
          showScrollBottom={showScrollBottom}
          isStreaming={isStreaming}
          isUserScrolledUp={isUserScrolledUp}
          scrollProgress={scrollProgress}
          onScrollToTop={scrollToTop}
          onScrollToBottom={scrollToBottom}
        />

        {/* Floating Glass Input Area */}
        <InputArea
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          disabled={false}
        />
      </div>

      {/* Slide-out Observability Telemetry Drawer */}
      <TraceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        latestMetric={latestMetric}
      />

      {/* Model Orchestrator Modal */}
      <ModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        models={models}
        onRefreshModels={refreshModels}
        onSelectModel={setCurrentModel}
        currentModel={currentModel}
      />
    </div>
  );
};
