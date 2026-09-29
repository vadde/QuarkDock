# Service Specification: Glassmorphic Chat UI (React 19)

- **Spec ID**: SPEC-003
- **Status**: PLANNED
- **Owner**: QuarkDock Core Architecture & UI/UX Lab
- **Last Updated**: 2026-09-29

---

## 1. Overview & Purpose
A state-of-the-art conversational interface built with React 19, TypeScript, and modern CSS. Incorporates cutting-edge visual design paradigms: Liquid Glass, macOS Acrylic/Vibrancy, Fluent Motion, and Plasma Aura effects. Connects directly to the FastAPI backend via Server-Sent Events (SSE) and displays live Langfuse observability links and LLM-as-judge evaluation scores.

## 2. Architectural Boundaries & Dependencies
- **Container Name**: `quarkdock-ui`
- **Internal Network**: `quarkdock-net` (addressable as `http://ui:3000`)
- **Host Port Binding**: `3000:3000`
- **Upstream Dependencies**:
  - `api`: `http://api:8000` (via Vite proxy or direct fetch)
  - `langfuse`: `http://localhost:3001` (client-side deep link navigation)
- **Downstream Consumers**: End users via web browser

## 3. Resource Budget (MacBook M5 Pro Allocation)
- **Memory Limit**: 256 MB (Nginx / static serving runtime in Docker)
- **CPU Limit**: 1 core
- **Client Bundle Size**: < 200 KB gzipped initial bundle
- **Animation Performance**: 60 FPS minimum on macOS Safari/Chrome/Firefox (CSS GPU-accelerated backdrop-filter and transforms)

## 4. UI/UX Design System & Features
- **Design Tokens**:
  - Surface: `backdrop-filter: blur(20px) saturate(180%)`, semi-transparent frosted acrylic.
  - Border: 1px subtle gradient border with liquid specular highlight (`rgba(255, 255, 255, 0.15)`).
  - Glow/Aura: Ambient plasma glow pulsing softly behind active generation bubbles.
  - Typography: Google Inter / JetBrains Mono for code blocks.
- **Key Capabilities**:
  - Real-time token streaming with smooth cursor animation.
  - Markdown rendering with syntax highlighting, copy-code button, and language tags.
  - Model selector pill dropdown (Qwen 2.5, Gemma 3, etc.) fetching live catalog from API.
  - Observability Drawer: Click to view Langfuse trace ID, latency, token count, and evaluation verdict.
  - Thumbs up/down feedback widget linked to trace score API.
  - Session history sidebar with glass card layout.

## 5. Failure Modes & Fallback Behavior
- **Stream Interruption**: If SSE connection drops, preserve all generated text up to the failure point, display an inline amber reconnect banner, and provide a single-click "Retry" button.
- **Backend Offline**: Display sleek frosted modal indicating backend status with auto-retry countdown.

## 6. Acceptance Criteria
- [ ] UI loads instantly on `http://localhost:3000` with 0 console errors.
- [ ] SSE chat messages stream smoothly with realistic token-by-token visual flow.
- [ ] Code blocks render syntax highlighted with functional copy button.
- [ ] Trace ID pill opens Langfuse trace URL in new tab.
- [ ] Responsive across mobile, tablet, and ultra-wide displays.
