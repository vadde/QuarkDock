"""Evaluation rubrics for LLM-as-a-judge quality scoring."""

from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class Rubric:
    name: str
    description: str
    prompt_template: str


CORRECTNESS_RUBRIC = Rubric(
    name="correctness",
    description="Factual accuracy, logic validity, and absence of hallucinations.",
    prompt_template="""You are an expert evaluator. Score the following AI response on factual correctness and logical accuracy from 1 to 5:
1 = Factually incorrect, fabricated claims, or invalid logic.
3 = Partially correct, minor factual or logical omissions.
5 = Completely correct, airtight logic, zero hallucinations.

[User Query]: {query}
[AI Response]: {response}

Reply with ONLY an integer score from 1 to 5, followed by a one-sentence rationale:
Score: <1-5>
Rationale: <explanation>""",
)

CONCISENESS_RUBRIC = Rubric(
    name="conciseness",
    description="Efficiency of expression, no fluff or repetitive verbiage.",
    prompt_template="""You are an expert evaluator. Score the following AI response on conciseness and information density from 1 to 5:
1 = Excessively wordy, repetitive, unnecessary filler.
3 = Moderately concise with some unnecessary sentences.
5 = Perfectly concise, high information density, direct and punchy.

[User Query]: {query}
[AI Response]: {response}

Reply with ONLY an integer score from 1 to 5, followed by a one-sentence rationale:
Score: <1-5>
Rationale: <explanation>""",
)

HELPFULNESS_RUBRIC = Rubric(
    name="helpfulness",
    description="Practical utility, actionability, and alignment with user intent.",
    prompt_template="""You are an expert evaluator. Score how helpful and actionable this AI response is from 1 to 5:
1 = Unhelpful, evasive, or unexecutable.
3 = Somewhat helpful but requires further follow-up.
5 = Extremely helpful, fully addresses user intent with practical clarity.

[User Query]: {query}
[AI Response]: {response}

Reply with ONLY an integer score from 1 to 5, followed by a one-sentence rationale:
Score: <1-5>
Rationale: <explanation>""",
)

ACTIVE_RUBRICS = (CORRECTNESS_RUBRIC, CONCISENESS_RUBRIC, HELPFULNESS_RUBRIC)
