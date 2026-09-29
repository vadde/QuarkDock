import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ThumbsUp, ThumbsDown, Copy, Check, ExternalLink, Bot, User } from 'lucide-react';
import { Message } from '../types/chat';

interface MessageItemProps {
  message: Message;
  onFeedback: (traceId: string, value: number) => void;
}

/**
 * Normalizes mathematical and logical notation emitted by LLMs:
 * - Preserves code blocks (``` and `) from alteration.
 * - Converts \[ ... \] to display math $$ ... $$.
 * - Converts \( ... \) to inline math $ ... $.
 * - Converts parenthetical logic/math expressions containing LaTeX macros
 *   (e.g., (A \lor \neg B = \text{true})) into KaTeX inline math $(A \lor \neg B = \text{true})$.
 */
const normalizeMath = (text: string): string => {
  if (!text) return '';

  // Preserve code blocks and inline code
  const codeBlocks: string[] = [];
  let processed = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 1. Convert \[ ... \] to $$ ... $$ (display math)
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);

  // 2. Convert \( ... \) to $ ... $ (inline math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

  // 3. Detect parenthetical expressions with LaTeX math keywords OUTSIDE of existing $ blocks
  const mathCommands = "(?:lor|land|neg|text|rightarrow|leftarrow|implies|iff|forall|exists|in|notin|subset|subseteq|cap|cup|times|div|pm|leq|geq|neq|approx|equiv|sum|prod|int|frac|sqrt|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|infty|vee|wedge|top|bot)";
  const parenMathRegex = new RegExp(`\\(([^()\\n]*\\\\${mathCommands}[^()\\n]*)\\)`, "g");

  const parts = processed.split("$");
  // Even indexes (0, 2, 4...) are OUTSIDE math blocks
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(parenMathRegex, (_, inner) => `$(${inner})$`);
  }
  processed = parts.join("$");

  // 4. Merge adjacent math blocks connected by LaTeX operators (e.g. "$A$ \land $B$" -> "$A \land B$")
  for (let i = 0; i < 5; i++) {
    const next = processed.replace(
      /\$([^\$\n]+?)\$\s*(\\[a-zA-Z]+|[=+\-*\/\u2227\u2228])\s*\$([^\$\n]+?)\$/g,
      (_, g1, op, g3) => `$${g1} ${op} ${g3}$`
    );
    if (next === processed) break;
    processed = next;
  }

  // 5. Wrap any remaining isolated LaTeX commands outside of $ blocks
  const parts2 = processed.split("$");
  const isolatedRegex = new RegExp(`\\\\(${mathCommands}(?:\\{[^}]*\\})?)`, "g");
  for (let i = 0; i < parts2.length; i += 2) {
    parts2[i] = parts2[i].replace(isolatedRegex, (_, cmd) => `$\\${cmd}$`);
  }
  processed = parts2.join("$");

  // 6. Final merge pass in case step 5 created adjacent blocks
  for (let i = 0; i < 3; i++) {
    const next = processed.replace(
      /\$([^\$\n]+?)\$\s*(\\[a-zA-Z]+|[=+\-*\/\u2227\u2228])\s*\$([^\$\n]+?)\$/g,
      (_, g1, op, g3) => `$${g1} ${op} ${g3}$`
    );
    if (next === processed) break;
    processed = next;
  }

  // 7. Restore code blocks
  return processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)]);
};

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
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
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
            {normalizeMath(message.content)}
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
