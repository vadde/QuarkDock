import React, { useState } from 'react';
import { X, Download, Trash2, Cpu, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { ModelDetail } from '../types/chat';

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelDetail[];
  onRefreshModels: () => void;
  onSelectModel: (name: string) => void;
  currentModel: string;
}

const PRESET_MODELS = [
  { name: 'llama3.2:3b', sizeDesc: '2.0 GB', desc: 'Ultra-lightweight & lightning fast' },
  { name: 'qwen2.5:7b', sizeDesc: '4.7 GB', desc: 'SOTA general reasoning & code' },
  { name: 'gemma3:4b', sizeDesc: '2.8 GB', desc: 'Google next-gen compact model' },
  { name: 'deepseek-r1:7b', sizeDesc: '4.7 GB', desc: 'Chain-of-thought reasoning specialist' },
];

export const ModelModal: React.FC<ModelModalProps> = ({
  isOpen,
  onClose,
  models,
  onRefreshModels,
  onSelectModel,
  currentModel,
}) => {
  const [customModel, setCustomModel] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<string>('');
  const [pullProgress, setPullProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handlePullModel = async (modelName: string) => {
    if (!modelName.trim() || isPulling) return;

    setIsPulling(true);
    setErrorMsg('');
    setPullStatus(`Connecting to pull ${modelName}...`);
    setPullProgress(0);

    try {
      const response = await fetch('/api/v1/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to initiate model pull (HTTP ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const eventData = JSON.parse(dataStr);
              if (eventData.error) {
                throw new Error(eventData.error);
              }
              if (eventData.status) {
                setPullStatus(eventData.status);
              }
              if (eventData.total && eventData.completed) {
                const pct = Math.round((eventData.completed / eventData.total) * 100);
                setPullProgress(pct);
              }
            } catch (e: any) {
              if (e.message) setErrorMsg(e.message);
            }
          }
        }
      }

      setPullStatus('Model pulled successfully!');
      setPullProgress(100);
      onRefreshModels();
      onSelectModel(modelName);
      setCustomModel('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error pulling model');
    } finally {
      setIsPulling(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete model ${modelName}?`)) return;

    try {
      const res = await fetch(`/api/v1/models/${encodeURIComponent(modelName)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefreshModels();
        if (currentModel === modelName && models.length > 1) {
          const next = models.find((m) => m.name !== modelName);
          if (next) onSelectModel(next.name);
        }
      } else {
        alert('Failed to delete model');
      }
    } catch (e) {
      alert('Error deleting model');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(135deg, rgba(22, 22, 36, 0.95), rgba(14, 14, 24, 0.98))',
          border: '1px solid var(--glass-border-glow)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--plasma-violet), var(--plasma-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                LLM Model Orchestrator
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Zap size={12} color="#10b981" />
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                  Host Apple Metal GPU Accelerated
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active / Loaded Models */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Loaded Local Models ({models.length})
              </span>
              <button
                onClick={onRefreshModels}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {models.map((m) => {
                const isSelected = m.name === currentModel;
                return (
                  <div
                    key={m.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--plasma-violet)' : '1px solid var(--glass-border)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#a78bfa',
                            fontWeight: 500,
                          }}
                        >
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isSelected && (
                        <button
                          onClick={() => {
                            onSelectModel(m.name);
                            onClose();
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '6px',
                            color: '#ffffff',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Select
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteModel(m.name)}
                        title="Delete model from disk"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          padding: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preset 1-Click Pull Recommendations */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
              Optimized for Apple Silicon M-Series
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {PRESET_MODELS.map((preset) => {
                const isAlreadyLoaded = models.some((m) => m.name.startsWith(preset.name.split(':')[0]));
                return (
                  <div
                    key={preset.name}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff' }}>
                          {preset.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {preset.sizeDesc}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        {preset.desc}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePullModel(preset.name)}
                      disabled={isPulling || isAlreadyLoaded}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px',
                        borderRadius: '6px',
                        background: isAlreadyLoaded
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(139, 92, 246, 0.2)',
                        border: isAlreadyLoaded
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : '1px solid rgba(139, 92, 246, 0.3)',
                        color: isAlreadyLoaded ? '#34d399' : '#c4b5fd',
                        fontSize: '0.75rem',
                        cursor: isAlreadyLoaded || isPulling ? 'default' : 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {isAlreadyLoaded ? (
                        <>
                          <CheckCircle2 size={12} /> Installed
                        </>
                      ) : (
                        <>
                          <Download size={12} /> Pull Model
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Tag Pull Input */}
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Pull Any Custom Ollama Tag
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. mistral:7b or deepseek-coder:6.7b"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                disabled={isPulling}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handlePullModel(customModel)}
                disabled={isPulling || !customModel.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--plasma-violet)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  cursor: isPulling || !customModel.trim() ? 'not-allowed' : 'pointer',
                  opacity: isPulling || !customModel.trim() ? 0.5 : 1,
                }}
              >
                <Download size={14} />
                <span>Pull</span>
              </button>
            </div>
          </div>

          {/* Pull Progress & Status Bar */}
          {isPulling && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{pullStatus}</span>
                <span style={{ color: 'var(--plasma-cyan)', fontWeight: 600 }}>{pullProgress}%</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pullProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--plasma-violet), var(--plasma-cyan))',
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f87171',
                fontSize: '0.8rem',
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
