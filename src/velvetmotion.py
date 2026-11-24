"""VelvetMotion Python response generator with optional HuggingFace RoBERTa support."""

from __future__ import annotations

import os
from typing import Any, Optional, Tuple

from src.utils import normalize_prompt

_MODEL_CACHE: Optional[Tuple[Any, Any]] = None


def load_roberta_pipeline(model_name: str = "roberta-base") -> Optional[Tuple[Any, Any]]:
    """Lazily load RobertaTokenizer and RobertaForMaskedLM when explicitly enabled."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
    if os.environ.get("VELVETMOTION_LOAD_ROBERTA") != "1":
        return None
    try:
        from transformers import RobertaForMaskedLM, RobertaTokenizer  # type: ignore

        tokenizer = RobertaTokenizer.from_pretrained(model_name)
        model = RobertaForMaskedLM.from_pretrained(model_name)
        _MODEL_CACHE = (tokenizer, model)
        return _MODEL_CACHE
    except Exception:
        return None


def generate_response(prompt: str) -> str:
    """Generate a deterministic VelvetMotion response echoing the normalized prompt prefix."""
    cleaned = normalize_prompt(prompt)
    if not cleaned:
        return "Hello from VelvetMotion AI."
    load_roberta_pipeline()
    return f"{cleaned} — VelvetMotion AI is ready."
