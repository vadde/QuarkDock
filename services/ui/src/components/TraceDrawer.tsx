import React from 'react';
import { X, ExternalLink, Activity, Zap, Clock, Hash, CheckCircle2 } from 'lucide-react';
import { TraceMetric } from '../types/chat';

interface TraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  latestMetric: TraceMetric | null;
}

export const TraceDrawer: React.FC<TraceDrawerProps> = ({ isOpen, onClose, latestMetric }) => {
  if (!isOpen) return null;

  return (
    <aside className="trace-drawer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Activity size={18} color="var(--plasma-violet)" />
          <span>Observability Live Trace</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {latestMetric ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Active Trace ID */}
          <div className="metric-card">
            <span className="metric-label">Active Trace ID</span>
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#c4b5fd', wordBreak: 'break-all' }}>
              {latestMetric.traceId}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="metric-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="var(--plasma-cyan)" />
                <span className="metric-label">Velocity</span>
              </div>
              <span className="metric-value" style={{ color: 'var(--plasma-cyan)' }}>
                {latestMetric.tokensPerSec} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>t/s</span>
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="var(--plasma-amber)" />
                <span className="metric-label">Latency</span>
              </div>
              <span className="metric-value">
                {(latestMetric.durationMs / 1000).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>s</span>
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={14} color="var(--plasma-emerald)" />
                <span className="metric-label">Tokens</span>
              </div>
              <span className="metric-value" style={{ color: '#34d399' }}>
                {latestMetric.totalTokens}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Model Engine</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {latestMetric.model}
              </span>
            </div>
          </div>

          {/* Deep link into Langfuse */}
          <a
            href={latestMetric.traceUrl || `http://localhost:3001/project/default/traces/${latestMetric.traceId}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginTop: '8px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span>Inspect in Langfuse Dashboard</span>
            <ExternalLink size={14} />
          </a>
        </div>
      ) : (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>
          Send a chat prompt to generate and inspect live Langfuse trace spans.
        </div>
      )}

      {/* Observability Stack Health */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>Telemetry Services</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Langfuse Server (:3001)</span>
          <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Active
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>PostgreSQL Metadata (:5432)</span>
          <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Active
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Redis Session Cache (:6379)</span>
          <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Active
          </span>
        </div>
      </div>
    </aside>
  );
};
