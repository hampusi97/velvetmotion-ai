"""Prompt formatting utilities for VelvetMotion Python modules."""

from __future__ import annotations


def normalize_prompt(prompt: str) -> str:
    """Strip excess whitespace while preserving the caller's leading greeting."""
    if not isinstance(prompt, str):
        return ""
    return " ".join(prompt.strip().split())
