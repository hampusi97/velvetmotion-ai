"""Prompt formatting utilities for VelvetMotion Python modules."""

from __future__ import annotations


def normalize_prompt(prompt: str) -> str:
    """Strip excess whitespace while preserving the caller's leading greeting."""
    if not isinstance(prompt, str):
        return ""
    return " ".join(prompt.strip().split())


def slugify_prompt(prompt: str) -> str:
    """Return a slugified version of the prompt.

    The function normalizes the prompt, converts it to lowercase, and replaces
    spaces with hyphens.  It is intended for creating identifier strings from
    user prompts.
    """
    return normalize_prompt(prompt).lower().replace(" ", "-")
