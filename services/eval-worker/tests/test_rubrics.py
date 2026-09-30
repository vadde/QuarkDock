"""Unit tests for rubric definitions."""

from src.rubrics import ACTIVE_RUBRICS, CONCISENESS_RUBRIC, CORRECTNESS_RUBRIC, HELPFULNESS_RUBRIC


def test_rubrics_structure():
    assert len(ACTIVE_RUBRICS) == 3
    names = {r.name for r in ACTIVE_RUBRICS}
    assert names == {"correctness", "conciseness", "helpfulness"}

    for rubric in (CORRECTNESS_RUBRIC, CONCISENESS_RUBRIC, HELPFULNESS_RUBRIC):
        assert rubric.name
        assert rubric.description
        assert "{query}" in rubric.prompt_template
        assert "{response}" in rubric.prompt_template

        formatted = rubric.prompt_template.format(query="hello", response="world")
        assert "hello" in formatted
        assert "world" in formatted
