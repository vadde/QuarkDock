import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';

interface InputAreaProps {
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

const SUGGESTIONS = [
  'Explain quantum entanglement in 2 sentences',
  'Write a Python generator for prime numbers (__slots__)',
  'How does Apple Silicon Unified Memory speed up LLMs?',
];

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on input content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="input-dock">
      {/* Quick Prompts Suggestions (only visible when input is empty) */}
      {!input && !isStreaming && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(s)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Sparkles size={11} color="var(--plasma-violet)" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Glass Input Bar */}
      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="prompt-textarea"
          rows={1}
          placeholder="Message Qwen 2.5 local model... (Shift + Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled && !isStreaming}
        />

        {isStreaming ? (
          <button className="send-btn" onClick={onStopStreaming} title="Stop Generation" style={{ background: '#f43f5e' }}>
            <Square size={16} fill="#ffffff" />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
