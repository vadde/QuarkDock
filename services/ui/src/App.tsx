import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { InputArea } from './components/InputArea';
import { TraceDrawer } from './components/TraceDrawer';
import { Message, ModelDetail, TraceMetric } from './types/chat';

export const App: React.FC = () => {
  const [models, setModels] = useState<ModelDetail[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('qwen2.5:7b');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to **QuarkDock**.\n\nI am your local **Qwen 2.5 (7B)** model running directly on this machine with full **Langfuse v3** tracing and streaming SSE telemetry.\n\nHow can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [latestMetric, setLatestMetric] = useState<TraceMetric | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch available models from local API on mount
  useEffect(() => {
    fetch('/api/v1/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.models && data.models.length > 0) {
          setModels(data.models);
          setCurrentModel(data.default_model || data.models[0].name);
        } else {
          setModels([{ name: 'qwen2.5:7b', size: 4683087332 }]);
        }
      })
      .catch(() => {
        setModels([{ name: 'qwen2.5:7b', size: 4683087332 }]);
      });
  }, []);

  const handleNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'New session started. How can I assist you?',
        timestamp: Date.now(),
      },
    ]);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg, i) => (i === prev.length - 1 ? { ...msg, isStreaming: false } : msg))
    );
  };

  const handleFeedback = async (traceId: string, value: number) => {
    // Optimistic UI update
    setMessages((prev) =>
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

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, initialAssistantMessage]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const apiMessages = updatedMessages
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
              setMessages((prev) =>
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
              setMessages((prev) =>
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
              setMessages((prev) =>
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
            setMessages((prev) =>
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
        setMessages((prev) =>
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
      {/* Collapsible Left Sidebar */}
      <Sidebar onNewChat={handleNewChat} messageCount={messages.length} />

      {/* Main Chat Interface */}
      <div className="chat-main">
        <Header
          models={models}
          currentModel={currentModel}
          onSelectModel={setCurrentModel}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          isDrawerOpen={isDrawerOpen}
          isStreaming={isStreaming}
        />

        {/* Message Stream */}
        <div className="message-stream">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} onFeedback={handleFeedback} />
          ))}
          <div ref={messagesEndRef} />
        </div>

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
    </div>
  );
};
