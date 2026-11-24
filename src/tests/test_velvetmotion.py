"""Unit tests for src.velvetmotion generate_response."""

from __future__ import annotations

import unittest

from src.velvetmotion import generate_response


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


if __name__ == "__main__":
    unittest.main()
