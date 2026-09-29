# Service Context: Glassmorphic Chat UI (`services/ui`)

- **Domain**: Modern Conversational Web Interface & Observability Console
- **Framework & Runtime**: React 19 + TypeScript + Vite + Vanilla CSS
- **Default Port**: `3000` (Docker internal & host mapped)
- **Primary Spec**: [`SPEC-003: Glassmorphic Chat UI`](file:///specs/catalog/SPEC-003-glassmorphic-ui.md)

---

## 1. Architectural Mission
The UI service delivers an immersive, state-of-the-art chat experience:
1. Real-time streaming chat interaction consuming SSE events from `services/api`.
2. Visual design implementing modern aesthetics: Liquid Glass, macOS Acrylic/Vibrancy, Fluent Motion, and Plasma Aura glow effects.
3. Observability drawer exposing live Langfuse trace IDs, latency, token metrics, and user feedback buttons (+1 / -1).
4. Code block rendering with syntax highlighting, copy-to-clipboard, and language indicators.
5. Model picker dynamically reflecting available models from Ollama via the API.

---

## 2. Directory Layout & Module Plan
```
services/ui/
├── CONTEXT.md                # Architectural context (this file)
├── DEVLOG.md                 # Engineering devlog
├── STATUS.md                 # Operational status
├── Dockerfile                # Multi-stage Vite build + Nginx alpine
├── package.json              # React 19, Lucide icons, Vite
├── tsconfig.json             # Strict TypeScript configuration
├── vite.config.ts            # Vite config with API proxy
├── src/
│   ├── index.css             # Glassmorphic design tokens & animations
│   ├── main.tsx              # Root mount
│   ├── App.tsx               # Main layout (sidebar + chat area + drawer)
│   ├── components/
│   │   ├── Header.tsx        # Liquid glass navigation bar with model selector
│   │   ├── ChatList.tsx      # Virtualized / smooth scroll message list
│   │   ├── MessageBubble.tsx # Frosted glass bubble with syntax-highlighted code
│   │   ├── InputBox.tsx      # Frosted glass prompt bar with plasma send button
│   │   ├── TraceDrawer.tsx   # Slide-out glass drawer showing Langfuse metrics
│   │   └── ModelSelector.tsx # Dropdown pill for switching models
│   ├── hooks/
│   │   ├── useChatStream.ts  # SSE streaming consumer with abort controller
│   │   └── useModels.ts      # Model catalog fetcher
│   └── types/
│       └── chat.ts           # Strongly typed message & trace definitions
```

---

## 3. UI/UX Design System Invariants
- **No Plain / Flat Colors**: Use tailored HSL palettes, specular highlights, and ambient glow.
- **Glassmorphism**: Backdrop blur (`backdrop-filter: blur(20px)`), frosted transparency, and translucent gradient borders.
- **Micro-Animations**: Smooth token appearance, send button hover pulse, trace drawer slide-in transitions.
- **Zero Jitter**: Stable layout heights during streaming token insertion.
