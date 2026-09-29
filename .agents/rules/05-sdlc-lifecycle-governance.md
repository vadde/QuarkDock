# Rule 05: SDLC Lifecycle Governance

QuarkDock maintains a transparent, traceable engineering lifecycle. Every change, enhancement, and defect resolution must be reflected across project status artifacts.

---

## SDLC Governance Artifacts

```
QuarkDock/
├── sdlc/
│   ├── status-board.md   # Current operational status of all services & features
│   ├── ROADMAP.md        # Phased feature trajectory & delivery milestones
│   └── CHANGELOG.md      # Semantic, human-readable release log
├── services/
│   ├── api/
│   │   ├── CONTEXT.md    # Architecture, design decisions, dependency graph
│   │   ├── DEVLOG.md     # Chronological engineering diary of changes
│   │   └── STATUS.md     # Health, test metrics, benchmark results
│   └── ui/
│       ├── CONTEXT.md
│       ├── DEVLOG.md
│       └── STATUS.md
```

---

## Status Board Lifecycle States

Items on `sdlc/status-board.md` advance strictly through the following states:
1. `DRAFT`: Specification authoring in progress.
2. `PLANNED`: Spec approved; queued for development.
3. `IN_PROGRESS`: Active implementation branch/commit sequence underway.
4. `REVIEW`: Implementation complete; automated tests and linting passing.
5. `VERIFIED`: Docker Compose integration test verified on host.
6. `DONE`: Shipped, documented in CHANGELOG.md, and benchmarked.

---

## Service DEVLOG Protocol
- Every significant feature, refactoring, or bugfix committed to a service must include a timestamped entry in that service's `DEVLOG.md`.
- Include: Date, author/agent, scope, rationale, benchmark/test delta.
- Keep entries concise, technical, and actionable.
