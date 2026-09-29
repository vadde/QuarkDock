import React, { useState } from 'react';
import {
  X,
  Download,
  Trash2,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { ModelDetail, LLMSettings } from '../types/chat';

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelDetail[];
  onRefreshModels: () => void;
  onSelectModel: (name: string) => void;
  currentModel: string;
  llmSettings: LLMSettings;
  onUpdateLLMSettings: (settings: LLMSettings) => void;
}

const PRESET_MODELS = [
  { name: 'llama3.2:3b', sizeDesc: '2.0 GB', desc: 'Ultra-lightweight & lightning fast' },
  { name: 'qwen2.5:7b', sizeDesc: '4.7 GB', desc: 'SOTA general reasoning & code' },
  { name: 'gemma3:4b', sizeDesc: '2.8 GB', desc: 'Google next-gen compact model' },
  { name: 'deepseek-r1:7b', sizeDesc: '4.7 GB', desc: 'Chain-of-thought reasoning specialist' },
];

const SYSTEM_PROMPT_PRESETS = [
  {
    title: 'Default Engine',
    icon: Sparkles,
    prompt: '',
    desc: 'Standard local assistant behavior',
  },
  {
    title: 'Rule 09 Python Expert',
    icon: Terminal,
    prompt:
      'You are an expert Python performance architect. Strictly adhere to Rule 09: prioritize __slots__, generators, uvloop, orjson, and O(1) structures. Provide ultra-efficient, memory-conscious implementations.',
    desc: 'Zero-copy & high-efficiency code',
  },
  {
    title: 'Rule 10 SRE & Critic',
    icon: ShieldCheck,
    prompt:
      'You are an intellectually honest SRE and critical architecture partner adhering to Rule 10. Always provide a Dialectic Critique & Praise analysis, identify single points of failure, and highlight host resource trade-offs.',
    desc: 'Dialectic analysis & anti-yes-man posture',
  },
  {
    title: 'Ultra-Concise Architect',
    icon: Zap,
    prompt:
      'You are an ultra-concise technical expert. Respond in direct code and terse bullet points with zero filler or polite preamble.',
    desc: 'Direct code & bullets only',
  },
];

export const ModelModal: React.FC<ModelModalProps> = ({
  isOpen,
  onClose,
  models,
  onRefreshModels,
  onSelectModel,
  currentModel,
  llmSettings,
  onUpdateLLMSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'characteristics'>('models');
  const [customModel, setCustomModel] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<string>('');
  const [pullProgress, setPullProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

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
    if (confirm(`Are you sure you want to delete ${modelName} from local disk storage?`)) {
      setDeletingModel(modelName);
      try {
        const response = await fetch(`/api/v1/models/${encodeURIComponent(modelName)}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          onRefreshModels();
        } else {
          const err = await response.json();
          alert(`Failed to delete model: ${err.detail || 'Unknown error'}`);
        }
      } catch (err) {
        alert('Network error while deleting model');
      } finally {
        setDeletingModel(null);
      }
    }
  };

  const handleResetSettings = () => {
    onUpdateLLMSettings({
      temperature: 0.7,
      top_p: 0.9,
      systemPrompt: '',
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 50,
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
          background: 'rgba(16, 16, 26, 0.92)',
          border: '1px solid var(--glass-border-highlight)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.15)',
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
                LLM Engine & Hyperparameter Orchestrator
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Zap size={12} color="#10b981" />
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                  Host Apple Metal GPU Accelerated (Port 11434)
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

        {/* Modal Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            padding: '0 24px',
            gap: '16px',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <button
            onClick={() => setActiveTab('models')}
            style={{
              padding: '12px 6px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'models' ? '2px solid var(--plasma-cyan)' : '2px solid transparent',
              color: activeTab === 'models' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'models' ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms ease',
            }}
          >
            <Cpu size={14} color={activeTab === 'models' ? 'var(--plasma-cyan)' : 'var(--text-tertiary)'} />
            <span>Model Fleet ({models.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('characteristics')}
            style={{
              padding: '12px 6px',
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === 'characteristics' ? '2px solid var(--plasma-violet)' : '2px solid transparent',
              color: activeTab === 'characteristics' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'characteristics' ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms ease',
            }}
          >
            <Sliders
              size={14}
              color={activeTab === 'characteristics' ? 'var(--plasma-violet)' : 'var(--text-tertiary)'}
            />
            <span>Sampling & Hyperparameters (T: {llmSettings.temperature.toFixed(2)})</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeTab === 'models' ? (
            <>
              {/* Active / Loaded Models */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
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
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? 'var(--plasma-cyan)' : 'var(--text-tertiary)',
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>{m.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              {(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB • Host APFS Storage
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!isSelected && (
                            <button
                              onClick={() => onSelectModel(m.name)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                color: 'var(--text-secondary)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteModel(m.name)}
                            disabled={deletingModel === m.name}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-tertiary)',
                              padding: '6px',
                              cursor: deletingModel === m.name ? 'not-allowed' : 'pointer',
                              borderRadius: '6px',
                            }}
                            title="Delete model from disk"
                          >
                            <Trash2 size={15} color="#f87171" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preset Models Available to Pull */}
              <div>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: '10px',
                  }}
                >
                  Recommended High-Performance Models
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {PRESET_MODELS.map((preset) => {
                    const isAlreadyLoaded = models.some((m) => m.name === preset.name);
                    return (
                      <div
                        key={preset.name}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '10px',
                          padding: '12px 14px',
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
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              {preset.sizeDesc}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            {preset.desc}
                          </div>
                        </div>

                        <button
                          onClick={() => handlePullModel(preset.name)}
                          disabled={isAlreadyLoaded || isPulling}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: isAlreadyLoaded ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.15)',
                            border: isAlreadyLoaded
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : '1px solid var(--plasma-violet)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            color: isAlreadyLoaded ? '#10b981' : '#ffffff',
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
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: '6px',
                    }}
                  >
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
            </>
          ) : (
            /* Tab 2: Hyperparameters & Sampling Characteristics */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Temperature Control */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>
                      Sampling Temperature (T)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Controls randomness & entropy of token selection.
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background:
                        llmSettings.temperature > 1.15
                          ? 'rgba(239, 68, 68, 0.2)'
                          : llmSettings.temperature === 0
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(139, 92, 246, 0.2)',
                      color:
                        llmSettings.temperature > 1.15
                          ? '#f87171'
                          : llmSettings.temperature === 0
                            ? '#10b981'
                            : 'var(--plasma-cyan)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {llmSettings.temperature.toFixed(2)}
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={llmSettings.temperature}
                  onChange={(e) =>
                    onUpdateLLMSettings({ ...llmSettings, temperature: parseFloat(e.target.value) })
                  }
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor:
                      llmSettings.temperature > 1.15
                        ? '#ef4444'
                        : llmSettings.temperature === 0
                          ? '#10b981'
                          : 'var(--plasma-violet)',
                  }}
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: '0.0 (Deterministic / Code)', val: 0.0 },
                    { label: '0.2 (Analytical / Precise)', val: 0.2 },
                    { label: '0.7 (Balanced Default)', val: 0.7 },
                    { label: '1.1 (Creative Ideation)', val: 1.1 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => onUpdateLLMSettings({ ...llmSettings, temperature: p.val })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        background:
                          llmSettings.temperature === p.val
                            ? 'rgba(139, 92, 246, 0.25)'
                            : 'rgba(255, 255, 255, 0.04)',
                        border:
                          llmSettings.temperature === p.val
                            ? '1px solid var(--plasma-violet)'
                            : '1px solid var(--glass-border)',
                        color: llmSettings.temperature === p.val ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Real-time Warning Banner */}
                {llmSettings.temperature > 1.15 && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      color: '#fca5a5',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>High Entropy Warning (T &gt; 1.15):</strong> Low-probability tokens are actively
                      sampled. This frequently causes hallucinated library APIs, non-deterministic logic jumps, and
                      syntactic breakdown. Recommended only for creative writing or freeform brainstorming.
                    </span>
                  </div>
                )}

                {llmSettings.temperature === 0 && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      color: '#6ee7b7',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>Greedy Decoding Active (T = 0.0):</strong> Generates 100% reproducible, deterministic
                      responses. Ideal for coding challenges, unit test verification, and structured JSON parsing.
                    </span>
                  </div>
                )}
              </div>

              {/* Top-P (Nucleus Sampling) Control */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>
                      Top-P (Nucleus Sampling)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Restricts the cumulative probability pool of candidate tokens.
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: 'var(--plasma-cyan)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {llmSettings.top_p.toFixed(2)}
                  </div>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={llmSettings.top_p}
                  onChange={(e) =>
                    onUpdateLLMSettings({ ...llmSettings, top_p: parseFloat(e.target.value) })
                  }
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: 'var(--plasma-cyan)',
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { label: '0.50 (Strict)', val: 0.5 },
                    { label: '0.90 (Optimal Default)', val: 0.9 },
                    { label: '1.00 (Unfiltered)', val: 1.0 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => onUpdateLLMSettings({ ...llmSettings, top_p: p.val })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        background:
                          llmSettings.top_p === p.val
                            ? 'rgba(6, 182, 212, 0.25)'
                            : 'rgba(255, 255, 255, 0.04)',
                        border:
                          llmSettings.top_p === p.val
                            ? '1px solid var(--plasma-cyan)'
                            : '1px solid var(--glass-border)',
                        color: llmSettings.top_p === p.val ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Persona / Instructions */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>
                    Custom System Instruction / Persona
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Prepended to every query to enforce behavioral rules and output formats.
                  </div>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {SYSTEM_PROMPT_PRESETS.map((sp) => {
                    const IconComp = sp.icon;
                    const isActive = llmSettings.systemPrompt === sp.prompt;
                    return (
                      <button
                        key={sp.title}
                        onClick={() => onUpdateLLMSettings({ ...llmSettings, systemPrompt: sp.prompt })}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: isActive ? '1px solid var(--plasma-violet)' : '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <IconComp size={14} color={isActive ? 'var(--plasma-cyan)' : 'var(--text-tertiary)'} />
                        <div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: isActive ? '#ffffff' : 'var(--text-secondary)',
                            }}
                          >
                            {sp.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{sp.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  rows={3}
                  value={llmSettings.systemPrompt}
                  onChange={(e) => onUpdateLLMSettings({ ...llmSettings, systemPrompt: e.target.value })}
                  placeholder="Enter custom persona or reasoning constraints (e.g. You are a senior SRE...)"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Reset to Defaults Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleResetSettings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset to Recommended Defaults (T: 0.70, P: 0.90)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
