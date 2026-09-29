import React from 'react';
import { Plus, MessageSquare, Terminal, ShieldCheck, Database } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
  messageCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewChat, messageCount }) => {
  return (
    <aside className="app-sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={18} />
        <span>New Conversation</span>
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 4px' }}>
          Current Session
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            fontSize: '0.85rem',
          }}
        >
          <MessageSquare size={16} color="var(--plasma-violet)" />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Active Discussion ({messageCount} msgs)
          </span>
        </div>
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
          <span>Host Runtime:</span>
          <span style={{ color: '#e2e8f0', fontWeight: 500 }}>macOS Apple Silicon</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Docker Allocation:</span>
          <span style={{ color: '#38bdf8', fontWeight: 500 }}>12GB RAM • 14 CPUs</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Inference Rate:</span>
          <span style={{ color: '#34d399', fontWeight: 500 }}>~47 tokens/sec</span>
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
          <span>Ollama :11434</span>
        </a>
      </div>
    </aside>
  );
};
