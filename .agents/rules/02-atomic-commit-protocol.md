# Rule 02: Atomic Commit Protocol

Every commit in the QuarkDock repository must follow strict atomic commit standards. A commit history is an immutable engineering ledger, not a scratchpad.

---

## Commit Format

```
<type>(<scope>): <short imperative description>

[optional body explaining context, rationale, and impact]

[optional footer(s) referencing specs, issues, or breaking changes]
```

### Types
- `feat`: A new feature, service capability, or endpoint
- `fix`: A bug fix or defect resolution
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement (memory or compute optimization)
- `test`: Adding or correcting tests
- `docs`: Documentation changes only (specs, README, ADRs)
- `style`: Changes that do not affect code meaning (formatting, whitespace)
- `chore`: Build process, dependency updates, tooling, repo housekeeping
- `ci`: CI/CD workflows and automated scripts

### Scopes
The scope MUST pinpoint the exact architectural boundary affected:
- `repo`: Repository-level configuration, root dotfiles, licenses
- `api`: `services/api/` (FastAPI backend)
- `ui`: `services/ui/` (React 19 chat frontend)
- `infra`: `deploy/compose/`, Dockerfiles, root Makefile
- `specs`: `specs/` (specifications, templates, catalog)
- `sdlc`: `sdlc/` (status boards, roadmaps, changelogs)
- `eval`: `eval/` (LLM-as-judge benchmarks, evaluation test suits)
- `agents`: `.agents/` rules, skills, agent definitions

---

## Atomicity Rules

1. **One Concept Per Commit**: If a change involves updating the API and the UI, commit the API contract first, then the UI consumer second. Never lump cross-service changes into a single mega-commit unless it is a coordinated schema migration with zero independent validity.
2. **Every Commit Must Build & Pass**: Never commit broken intermediate states. A checkout of ANY commit in git history must pass `make lint` and relevant unit tests.
3. **Imperative Mood**: Use imperative, present tense ("add", "fix", "implement", NOT "added", "fixing").
4. **Body Explains 'Why', Not 'What'**: The diff already shows *what* changed; the commit body must document the architectural rationale, design trade-offs, and behavioral consequences.
5. **No Co-mingling of Lints and Features**: Run formatters and linters prior to committing; do not commit feature code alongside indiscriminate whole-repo formatting churn.
