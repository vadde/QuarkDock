export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  traceId?: string;
  traceUrl?: string;
  durationMs?: number;
  tokens?: number;
  isStreaming?: boolean;
  feedback?: 'positive' | 'negative';
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ModelDetail {
  name: string;
  size: number;
  modified_at?: string;
  digest?: string;
}

export interface TraceMetric {
  traceId: string;
  traceUrl: string;
  model: string;
  totalTokens: number;
  durationMs: number;
  tokensPerSec: number;
}
