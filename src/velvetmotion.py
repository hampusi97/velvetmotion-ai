"""VelvetMotion Python response generator with optional HuggingFace RoBERTa support."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Tuple

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


def build_character_card(prompt: str) -> Dict[str, Any]:
    """Build a structured companion character card dictionary for VelvetMotion AI."""
    return {
        "name": "Seraphina Vale",
        "tagline": "Midnight Jazz Pianist & Confidante",
        "personality": ["Warm", "Witty", "Observant", "Playfully Mysterious"],
        "voiceStyle": "Velvet alto with unhurried cadence",
        "openingGreeting": (
            "The lounge finally quieted down—come sit by the piano and tell me what's on your mind tonight."
        ),
        "starterPrompts": [
            "Play something slow and tell me about the song you're writing.",
            "What's the strangest secret someone ever confessed in this lounge?",
            "Let's plan a late-night walk through the neon district after closing time.",
        ],
        "sourcePrompt": prompt,
    }


def build_story_scenarios() -> List[Dict[str, Any]]:
    """Return interactive branching story scenarios for VelvetMotion AI."""
    return [
        {
            "id": "neon-observatory",
            "title": "After-Hours at the Sky Observatory",
            "setting": "Private glass dome overlooking the city skyline during a meteor shower.",
            "choices": [
                "Adjust the telescope toward the horizon",
                "Share a quiet drink on the balcony terrace",
                "Ask about the locked star-chart archive",
            ],
        },
        {
            "id": "velvet-express",
            "title": "Midnight Sleeper Train",
            "setting": "Art-deco dining car crossing alpine viaducts in the snow.",
            "choices": [
                "Join the companion at the window booth",
                "Inspect the mysterious invitation left on the table",
                "Retire to the private lounge compartment",
            ],
        },
    ]


def generate_response(prompt: str) -> str:
    """Generate a deterministic VelvetMotion response echoing the normalized prompt prefix."""
    cleaned = normalize_prompt(prompt)
    if not cleaned:
        return "Hello from VelvetMotion AI."
    load_roberta_pipeline()

    lowered = cleaned.lower()
    if any(keyword in lowered for keyword in ("character", "bio", "card", "json", "story", "scenario")):
        payload = {
            "characterCard": build_character_card(cleaned),
            "storyScenarios": build_story_scenarios(),
        }
        return f"{cleaned}\n\n{json.dumps(payload, indent=2)}"

    return f"{cleaned} — VelvetMotion AI is ready."
