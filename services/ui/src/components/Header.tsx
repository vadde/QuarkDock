import React from 'react';
import { Cpu, Activity, ExternalLink, Sparkles, PanelLeft, PanelLeftClose } from 'lucide-react';
import { ModelDetail } from '../types/chat';

interface HeaderProps {
  models: ModelDetail[];
  currentModel: string;
  onSelectModel: (model: string) => void;
  onToggleDrawer: () => void;
  onOpenModelModal: () => void;
  isDrawerOpen: boolean;
  isStreaming: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  models,
  currentModel,
  onSelectModel,
  onToggleDrawer,
  onOpenModelModal,
  isDrawerOpen,
  isStreaming,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <header className="app-header">
      <div className="logo-group">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Collapse Conversations (⌘B)" : "Expand Conversations (⌘B)"}
          aria-label="Toggle sessions sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
        <div className="logo-badge">
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <h1 className="logo-title">QuarkDock</h1>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          <span>{isStreaming ? 'Streaming...' : 'Local Engine Ready'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Model Selector & Management */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} color="var(--text-tertiary)" />
          <select
            value={currentModel}
            onChange={(e) => onSelectModel(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.name} value={m.name} style={{ background: '#12121c', color: '#fff' }}>
                  {m.name} ({(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)
                </option>
              ))
            ) : (
              <option value="qwen2.5:7b" style={{ background: '#12121c', color: '#fff' }}>
                qwen2.5:7b
              </option>
            )}
          </select>

          <button
            onClick={onOpenModelModal}
            title="Manage & Pull Models"
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#c4b5fd',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 150ms ease',
            }}
          >
            <span>Manage</span>
          </button>
        </div>

        {/* Observability Toggle Button */}
        <button
          onClick={onToggleDrawer}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isDrawerOpen ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
            border: isDrawerOpen ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--glass-border)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: isDrawerOpen ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <Activity size={15} color={isDrawerOpen ? '#c4b5fd' : 'var(--text-secondary)'} />
          <span>Telemetry</span>
        </button>

        {/* Link to Langfuse Dashboard */}
        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noreferrer"
          title="Open Langfuse Dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <span>Langfuse</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </header>
  );
};
