# Rule 06: Agent Autonomy Boundaries

Autonomous agents operating in QuarkDock must respect clear decision boundaries to prevent uncoordinated changes, data loss, or system instability.

---

## Autonomous Actions (Permitted Without Prompting)
- Authoring and updating specs in `specs/catalog/` according to templates.
- Writing unit, property, and integration tests.
- Implementing features that conform directly to an approved specification.
- Applying code optimizations compliant with Rule 09 (Python Efficiency).
- Running linters, formatters, and type checkers (`ruff`, `mypy`, `eslint`, `tsc`).
- Creating atomic commits using Rule 02 protocol.
- Updating `DEVLOG.md`, `STATUS.md`, and `sdlc/status-board.md`.

---

## Gated Actions (Requires Explicit User Consent)
- Deleting or destroying persistent volumes (`docker compose down -v`, removing model caches).
- Modifying host system configuration outside the workspace directory.
- Changing core framework decisions (e.g. replacing FastAPI with another framework, replacing React 19).
- Force-pushing (`git push --force`) to any branch.
- Modifying security policies or injecting credentials into source control.

---

## Sanity & Safety Checks
- Before issuing long-running commands, verify timeout mechanisms.
- Before launching Docker builds, ensure Docker daemon is running and resource limits are configured.
- When generating files, never leave placeholders or unfinished `TODO` stubs in production paths.
