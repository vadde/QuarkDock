import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThumbsUp, ThumbsDown, Copy, Check, ExternalLink, Bot, User } from 'lucide-react';
import { Message } from '../types/chat';

interface MessageItemProps {
  message: Message;
  onFeedback: (traceId: string, value: number) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onFeedback }) => {
  const isUser = message.role === 'user';
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={`message-card ${isUser ? 'user' : 'assistant'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
        {isUser ? <User size={14} /> : <Bot size={14} color="var(--plasma-cyan)" />}
        <span>{isUser ? 'You' : 'Qwen 2.5 (7B)'}</span>
      </div>

      <div className={`glass-panel ${isUser ? 'bubble-user' : `bubble-assistant ${message.isStreaming ? 'streaming' : ''}`}`}>
        <div className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre({ children }) {
                // Return Fragment to avoid nested pre tags when code block renders
                return <>{children}</>;
              },
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const isMultiLine = codeString.includes('\n');
                const blockKey = `${message.id}-${codeString.slice(0, 12)}`;

                if (match || isMultiLine) {
                  const lang = match ? match[1] : 'code';
                  return (
                    <div className="code-block">
                      <div className="code-header">
                        <span>{lang}</span>
                        <button className="copy-btn" onClick={() => handleCopy(codeString, blockKey)}>
                          {copiedKey === blockKey ? (
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
                        <code>{codeString}</code>
                      </pre>
                    </div>
                  );
                }

                return (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
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
                ? ` (${Math.round(message.tokens / (message.durationMs / 1000))} t/s)`
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
