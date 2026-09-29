# Rule 07: Service Context Preservation

To allow long-term collaboration, asynchronous agent handoffs, and developer onboarding, every service in QuarkDock must preserve its architectural context locally.

---

## The Service Triad: CONTEXT, DEVLOG, STATUS

Every service under `services/<service-name>/` MUST contain three governance files:

### 1. `CONTEXT.md`
- **Purpose**: High-level architectural orientation for humans and LLM agents.
- **Contents**:
  - What this service does and why it exists.
  - Runtime environment, port bindings, and external dependencies.
  - Internal directory breakdown (`src/routers/`, `src/services/`, `src/core/`).
  - Key architectural trade-offs, constraints, and invariants.
  - How to run, test, and debug locally.

### 2. `DEVLOG.md`
- **Purpose**: Chronological engineering diary.
- **Contents**:
  - Reverse chronological entries (`## [YYYY-MM-DD] - Summary`).
  - Decisions made, alternatives considered, benchmarks achieved.
  - Known issues or tech debt items identified during development.

### 3. `STATUS.md`
- **Purpose**: Machine-readable and human-verifiable operational status.
- **Contents**:
  - Current version (`v0.1.0-alpha`).
  - Test coverage percentage and test count.
  - Memory and latency benchmark snapshot.
  - Health check endpoint verification.
