import React from 'react';
import { Plus, MessageSquare, Terminal, ShieldCheck, Database, Trash2, Zap, PanelLeftClose } from 'lucide-react';
import { Session } from '../types/chat';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  isOpen,
  onToggle,
}) => {
  return (
    <aside className={`app-sidebar ${!isOpen ? 'collapsed' : ''}`} aria-hidden={!isOpen}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="new-chat-btn" onClick={onNewChat} style={{ flex: 1 }}>
          <Plus size={18} />
          <span>New Conversation</span>
        </button>
        <button
          className="sidebar-inner-close-btn"
          onClick={onToggle}
          title="Collapse Sidebar (⌘B)"
          aria-label="Collapse Sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Persistent Sessions List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '8px 4px 4px',
          }}
        >
          Conversations ({sessions.length})
        </div>

        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '10px',
                background: isActive ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive ? '1px solid var(--plasma-violet)' : '1px solid transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <MessageSquare size={15} color={isActive ? 'var(--plasma-cyan)' : 'var(--text-tertiary)'} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {session.title || 'Untitled Chat'}
                </span>
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Delete chat session"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    padding: '2px',
                    cursor: 'pointer',
                    opacity: isActive ? 0.8 : 0.3,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* System Hardware & Status Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f1f5f9' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Ecosystem Integrity</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Inference Engine:</span>
          <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={11} /> macOS Metal GPU
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Container Budget:</span>
          <span style={{ color: '#38bdf8', fontWeight: 500 }}>4GB RAM • 4 CPUs</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Langfuse Tracing:</span>
          <span style={{ color: '#c4b5fd', fontWeight: 500 }}>Active (v2 Native)</span>
        </div>
      </div>

      {/* Developer Links */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <a
          href="http://localhost:8002/docs"
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            fontSize: '0.75rem',
          }}
        >
          <Terminal size={12} />
          <span>API Docs</span>
        </a>
        <a
          href="http://localhost:11434/api/tags"
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            fontSize: '0.75rem',
          }}
        >
          <Database size={12} />
          <span>Metal :11434</span>
        </a>
      </div>
    </aside>
  );
};
