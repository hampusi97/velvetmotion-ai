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


def truncate_prompt(prompt: str, max_len: int = 200) -> str:
    """Return a truncated version of ``prompt``.

    Parameters
    ----------
    prompt:
        The input string to truncate.
    max_len:
        Maximum length of the returned string.  If ``prompt`` is longer than
        ``max_len`` it is shortened and an ellipsis (``…``) is appended.

    Returns
    -------
    str
        ``prompt`` or a shortened version that is never longer than
        ``max_len`` characters.
    """
    if not isinstance(prompt, str):
        return ""
    if len(prompt) <= max_len:
        return prompt
    return prompt[:max_len - 1] + "…"

