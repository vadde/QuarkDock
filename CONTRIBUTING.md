# Contributing to QuarkDock

Thank you for contributing to QuarkDock. To maintain world-class engineering standards, strict adherence to our SDD and code hygiene practices is required.

---

## 🏛️ Guiding Rules

Before opening a pull request or committing changes, review:
1. [Rule 01: Non-Negotiable Core Principles](file:///.agents/rules/01-non-negotiable-principles.md)
2. [Rule 02: Atomic Commit Protocol](file:///.agents/rules/02-atomic-commit-protocol.md)
3. [Rule 03: Spec-Driven Development](file:///.agents/rules/03-spec-driven-development.md)
4. [Rule 04: Cross-Service Blast Radius](file:///.agents/rules/04-cross-service-blast-radius.md)
5. [Rule 09: Python Performance & Memory Efficiency Manifesto](file:///.agents/rules/09-python-efficiency.md)

---

## 📋 The Contribution Workflow

### 1. Specification First
No code without a spec. For new features or services, write a specification under `specs/catalog/SPEC-XXX.md` using the templates in `specs/_templates/`.

### 2. Branching & Atomic Commits
- Use feature branches: `feature/<spec-id>-<short-description>` or `fix/<defect-id>-<short-description>`.
- Keep commits atomic: one logical change per commit.
- Use Conventional Commits (`feat(api): ...`, `fix(ui): ...`, `perf(api): ...`).

### 3. Python Engineering Standards (Rule 09)
Every line of Python must respect:
- `__slots__ = (...)` or `@dataclass(slots=True)` on internal classes.
- Zero-allocation generators and iterators.
- `orjson` for all JSON serialization.
- `httpx.AsyncClient` connection pooling.
- Streaming-first SSE endpoints.

### 4. Frontend Standards (React 19)
- Strictly modular TypeScript components.
- Zero raw inline colors — use CSS design tokens.
- Liquid Glass styling: `backdrop-filter: blur(20px)`, subtle highlights, smooth 60fps transitions.

### 5. Pre-Commit Validation
```bash
make lint
make test
make doctor
```

All checks must pass before opening a Pull Request.
