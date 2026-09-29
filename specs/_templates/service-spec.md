# Service Specification: [Service Name]

- **Spec ID**: SPEC-XXX
- **Status**: [DRAFT | PLANNED | IN_PROGRESS | REVIEW | VERIFIED | DONE]
- **Owner**: [Agent / Contributor]
- **Last Updated**: YYYY-MM-DD

---

## 1. Overview & Purpose
Brief description of the service, why it exists, and its core responsibility within the QuarkDock ecosystem.

## 2. Architectural Boundaries & Dependencies
- **Port Bindings**: Host Port / Internal Port
- **Upstream Dependencies**: [Services this service calls]
- **Downstream Consumers**: [Services that call this service]
- **Persistent Storage**: [Docker volumes, mount points]

## 3. Resource Budget (MacBook M5 Pro Allocation)
- **Memory Limit**: [e.g. 512MB / 6GB]
- **CPU Allocation**: [e.g. 1 core / 4 cores]
- **Timeout Thresholds**: [Connection, read, idle timeouts]

## 4. Interface Contracts
- **Protocols**: [HTTP REST / SSE / WebSocket / gRPC / RESP]
- **Endpoints & Schemas**:
  - `GET /health` -> `{"status": "ok", "version": "..."}`
  - `POST /v1/...` -> Request / Response schemas

## 5. Failure Modes & Fallback Behavior
- What happens if an upstream dependency is offline?
- What are the recovery and retry policies?

## 6. Acceptance Criteria
- [ ] Criterion 1 (verifiable assertion)
- [ ] Criterion 2 (health check response)
- [ ] Criterion 3 (benchmark / latency threshold)
