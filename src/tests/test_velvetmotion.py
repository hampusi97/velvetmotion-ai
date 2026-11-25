"""Unit tests for src.velvetmotion generate_response."""

from __future__ import annotations

import json
import unittest

from src.velvetmotion import build_character_card, build_story_scenarios, generate_response


def test_generate_response() -> None:
    prompt = "Hello"
    response = generate_response(prompt)
    assert response.startswith("Hello")


class TestVelvetMotionResponse(unittest.TestCase):
    def test_generate_response_starts_with_prompt(self) -> None:
        test_generate_response()

    def test_generate_response_handles_empty_prompt(self) -> None:
        response = generate_response("   ")
        self.assertTrue(response.startswith("Hello"))

    def test_generate_response_builds_character_card_and_scenarios(self) -> None:
        prompt = "Generate a JSON character card and story scenario pack"
        response = generate_response(prompt)
        self.assertTrue(response.startswith(prompt))
        json_part = response[len(prompt) :].strip()
        parsed = json.loads(json_part)
        self.assertIn("characterCard", parsed)
        self.assertIn("storyScenarios", parsed)
        self.assertEqual(parsed["characterCard"]["name"], "Seraphina Vale")
        self.assertGreaterEqual(len(parsed["storyScenarios"]), 2)

    def test_helpers_return_expected_structures(self) -> None:
        card = build_character_card("Test prompt")
        scenarios = build_story_scenarios()
        self.assertEqual(card["sourcePrompt"], "Test prompt")
        self.assertTrue(isinstance(scenarios, list) and len(scenarios) >= 2)


if __name__ == "__main__":
    unittest.main()
