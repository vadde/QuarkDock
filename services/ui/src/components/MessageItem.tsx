import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, ExternalLink, Bot, User } from 'lucide-react';
import { Message } from '../types/chat';

interface MessageItemProps {
  message: Message;
  onFeedback: (traceId: string, value: number) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onFeedback }) => {
  const isUser = message.role === 'user';
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple Markdown Code Block Parser
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim() || 'code';
        const code = lines.slice(1).join('\n') || lines[0];

        return (
          <div key={index} className="code-block">
            <div className="code-header">
              <span>{lang}</span>
              <button className="copy-btn" onClick={() => handleCopy(code, index)}>
                {copiedIndex === index ? (
                  <>
                    <Check size={13} color="#34d399" />
                    <span style={{ color: '#34d399' }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="code-content">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Render regular paragraphs preserving newlines
      return (
        <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
          {part}
        </span>
      );
    });
  };

  return (
    <div className={`message-card ${isUser ? 'user' : 'assistant'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
        {isUser ? <User size={14} /> : <Bot size={14} color="var(--plasma-cyan)" />}
        <span>{isUser ? 'You' : 'Qwen 2.5 (7B)'}</span>
      </div>

      <div className={`glass-panel ${isUser ? 'bubble-user' : `bubble-assistant ${message.isStreaming ? 'streaming' : ''}`}`}>
        {renderContent(message.content)}
        {message.isStreaming && <span className="streaming-cursor" />}
      </div>

      {/* Message Footer with Langfuse Trace Link and Rating */}
      {!isUser && !message.isStreaming && message.traceId && (
        <div className="message-footer">
          {/* Trace Badge */}
          <a
            href={message.traceUrl || `http://localhost:3001/project/default/traces/${message.traceId}`}
            target="_blank"
            rel="noreferrer"
            className="trace-pill"
            title="Inspect in Langfuse"
          >
            <span>Trace {message.traceId.slice(0, 8)}...</span>
            <ExternalLink size={10} />
          </a>

          {/* Metrics */}
          {message.tokens !== undefined && (
            <span>
              {message.tokens} tokens
              {message.durationMs ? ` in ${(message.durationMs / 1000).toFixed(2)}s` : ''}
              {message.tokens && message.durationMs
                ? ` (${Math.round((message.tokens / (message.durationMs / 1000)))} t/s)`
                : ''}
            </span>
          )}

          {/* Feedback Buttons */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            <button
              className={`feedback-btn ${message.feedback === 'positive' ? 'active-positive' : ''}`}
              onClick={() => onFeedback(message.traceId!, 1.0)}
              title="Good Response"
            >
              <ThumbsUp size={13} />
            </button>
            <button
              className={`feedback-btn ${message.feedback === 'negative' ? 'active-negative' : ''}`}
              onClick={() => onFeedback(message.traceId!, -1.0)}
              title="Poor Response"
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
