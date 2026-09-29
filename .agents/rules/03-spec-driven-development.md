# Rule 03: Spec-Driven Development (SDD)

QuarkDock enforces a strict Spec-Driven Development (SDD) lifecycle. Specifications are living source-of-truth contracts that precede, guide, and validate all engineering implementations.

---

## The SDD Lifecycle

```
[Requirement / Idea]
         │
         ▼
[Author / Update Spec]  ──► Located in `specs/catalog/SPEC-XXX.md`
         │
         ▼
  [Review & Freeze]     ──► Inputs, Outputs, Failure Modes, Resource Budgets defined
         │
         ▼
   [Implementation]     ──► Code in `services/` conforms strictly to spec
         │
         ▼
    [Validation]        ──► Automated tests verify all spec acceptance criteria
         │
         ▼
   [Status Sync]        ──► Update `sdlc/status-board.md` and service `DEVLOG.md`
```

---

## Spec Types & Templates

All specs must use the standardized templates in `specs/_templates/`:
1. **Service Spec** (`specs/_templates/service-spec.md`): For new microservices, standalone daemons, or infrastructure components.
2. **Feature Spec** (`specs/_templates/feature-spec.md`): For specific functional extensions (e.g., SSE streaming, Langfuse trace filtering, theme toggle).
3. **Defect Spec** (`specs/_templates/defect-spec.md`): For complex bug investigations, root cause analyses, and reproduction test suites.

---

## Mandatory Spec Sections

Every specification MUST define:
- **Unique Identifier**: `SPEC-XXX` where `XXX` is a sequential 3-digit zero-padded number.
- **Service Domain**: Scope of affected subsystems (`api`, `ui`, `infra`, `eval`).
- **Resource Budget**: CPU limits, memory bounds, timeout requirements.
- **Interface Contracts**: Complete OpenAPI / JSON schema / SSE event structure definitions.
- **Failure Modes & Edge Cases**: Explicit definitions of fallback behaviors when dependencies (e.g. Ollama or Langfuse) are offline.
- **Acceptance Criteria**: Verifiable, testable assertions with pass/fail gates.

---

## Spec Drift Prohibition
- Code must never diverge from its specification.
- If implementation discovers an unanticipated edge case or performance bottleneck, STOP coding.
- Update the spec first, commit the spec change, and only then update the implementation.
