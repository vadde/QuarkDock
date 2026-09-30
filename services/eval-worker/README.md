# ⚖️ QuarkDock Evaluation Worker (`services/eval-worker`)

Autonomous, decoupled background worker for continuous LLM-as-a-judge quality evaluation in QuarkDock.

---

## 🎯 Features
- **Decoupled Quality Auditing**: Observes generation traces in Langfuse without instrumenting client code.
- **Rule 09 Python Efficiency**: Low-overhead asynchronous polling daemon using `httpx`, `orjson`, and `__slots__`.
- **Three-Tier Evaluation Rubrics**:
  - `judge_correctness`: Factual accuracy, logic validity, absence of hallucinations.
  - `judge_conciseness`: Information density and avoidance of boilerplate verbiage.
  - `judge_helpfulness`: Practical utility and adherence to user intent.
- **Durable Exactly-Once Processing**: Local SQLite checkpoint database (`/data/eval_state.db`) ensures traces are never evaluated twice across restarts.
- **Native Metal Acceleration**: Leverages the local Apple Silicon Metal GPU Ollama instance (`qwen2.5:7b`) for sub-second judge scoring.

---

## 🚀 Running Locally

```bash
# From workspace root
pip install -e services/eval-worker
python -m src.main
```

## 🐳 Docker Deployment
Defined in `deploy/compose/docker-compose.yml` under the `eval-worker` service.
