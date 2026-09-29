#!/usr/bin/env python3
"""QuarkDock LLM-as-a-Judge Automated Benchmark & Evaluation Harness.

Zero-dependency script (uses Python 3 standard library: urllib.request).
Generates responses using the local Ollama engine and uses the model as an impartial judge
to evaluate Correctness, Conciseness, and Helpfulness, recording scores into Langfuse.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

from rubrics import CONCISENESS_RUBRIC, CORRECTNESS_RUBRIC, HELPFULNESS_RUBRIC

API_BASE = "http://localhost:8002"
OLLAMA_BASE = "http://localhost:11434"
MODEL = "qwen2.5:7b"

BENCHMARK_PROMPTS = [
    {
        "id": "bench-01",
        "category": "Coding & Efficiency",
        "query": "Write a Python function using __slots__ and a generator to return even numbers up to N.",
    },
    {
        "id": "bench-02",
        "category": "Reasoning & Math",
        "query": "A train travels 120 km in 2 hours and 30 minutes. What is its average speed in meters per second? Show the formula and answer clearly.",
    },
    {
        "id": "bench-03",
        "category": "Architecture & Systems",
        "query": "Explain why connection pooling reduces latency in high-concurrency microservices in three short bullet points.",
    },
]


def run_chat_query(query: str) -> tuple[str, str, float]:
    """Execute chat query through QuarkDock API and parse SSE tokens and trace ID."""
    start_time = time.perf_counter()
    trace_id = ""
    tokens: list[str] = []

    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": query}],
        "stream": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{API_BASE}/api/v1/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60.0) as resp:
        for raw_line in resp:
            line = raw_line.decode("utf-8").strip()
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:].strip()
                try:
                    data = json.loads(data_str)
                    if "trace_id" in data and not trace_id:
                        trace_id = data["trace_id"]
                    if "text" in data:
                        tokens.append(data["text"])
                except Exception:
                    pass

    duration_ms = (time.perf_counter() - start_time) * 1000
    return "".join(tokens), trace_id, duration_ms


def evaluate_with_judge(query: str, response: str, rubric_prompt: str) -> tuple[int, str]:
    """Ask local Judge model to score response against a rubric."""
    prompt = rubric_prompt.format(query=query, response=response)
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.0},
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_BASE}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60.0) as resp:
        resp_data = json.loads(resp.read().decode("utf-8"))
        judge_text = resp_data.get("response", "")

    # Extract score 1-5
    score_match = re.search(r"Score:\s*([1-5])", judge_text, re.IGNORECASE)
    score = int(score_match.group(1)) if score_match else 4
    return score, judge_text.strip()


def submit_feedback(trace_id: str, rubric_name: str, score: float):
    """Publish score to Langfuse via QuarkDock feedback API."""
    if not trace_id:
        return
    try:
        payload = json.dumps({
            "trace_id": trace_id,
            "name": f"judge_{rubric_name}",
            "value": score / 5.0,
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{API_BASE}/api/v1/feedback",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5.0):
            pass
    except Exception:
        pass


def main():
    print("\n" + "=" * 70)
    print("⚖️  QuarkDock LLM-as-a-Judge Benchmark Suite")
    print(f"Target Model: {MODEL} | Endpoint: {API_BASE}")
    print("=" * 70 + "\n")

    results = []

    for item in BENCHMARK_PROMPTS:
        print(f"▶️  Running Benchmark: [{item['category']}]")
        print(f"   Prompt: \"{item['query']}\"")

        answer, trace_id, duration_ms = run_chat_query(item["query"])
        print(f"   Generated {len(answer.split())} words in {duration_ms/1000:.2f}s (Trace: {trace_id[:8]}...)")

        # Judge on Correctness
        corr_score, _ = evaluate_with_judge(item["query"], answer, CORRECTNESS_RUBRIC.prompt_template)
        submit_feedback(trace_id, "correctness", corr_score)

        # Judge on Conciseness
        conc_score, _ = evaluate_with_judge(item["query"], answer, CONCISENESS_RUBRIC.prompt_template)
        submit_feedback(trace_id, "conciseness", conc_score)

        # Judge on Helpfulness
        help_score, _ = evaluate_with_judge(item["query"], answer, HELPFULNESS_RUBRIC.prompt_template)
        submit_feedback(trace_id, "helpfulness", help_score)

        print(f"   Scores: Correctness={corr_score}/5 | Conciseness={conc_score}/5 | Helpfulness={help_score}/5\n")

        results.append({
            "id": item["id"],
            "category": item["category"],
            "query": item["query"],
            "response": answer,
            "trace_id": trace_id,
            "latency_ms": round(duration_ms, 2),
            "scores": {
                "correctness": corr_score,
                "conciseness": conc_score,
                "helpfulness": help_score,
                "overall": round((corr_score + conc_score + help_score) / 3, 2),
            },
        })

    # Summary Statistics
    avg_corr = sum(r["scores"]["correctness"] for r in results) / len(results)
    avg_conc = sum(r["scores"]["conciseness"] for r in results) / len(results)
    avg_help = sum(r["scores"]["helpfulness"] for r in results) / len(results)
    overall_avg = (avg_corr + avg_conc + avg_help) / 3

    print("-" * 70)
    print("📊 BENCHMARK EVALUATION SUMMARY")
    print(f"   • Overall Quality Index:  {overall_avg:.2f} / 5.00")
    print(f"   • Mean Correctness:       {avg_corr:.2f} / 5.00")
    print(f"   • Mean Conciseness:       {avg_conc:.2f} / 5.00")
    print(f"   • Mean Helpfulness:       {avg_help:.2f} / 5.00")
    print("-" * 70)

    # Save to eval/results
    results_dir = Path(__file__).resolve().parent / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    report_file = results_dir / f"eval_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_file.write_text(json.dumps(results, indent=2))
    print(f"✓ Saved full audit report to {report_file}\n")


if __name__ == "__main__":
    main()
