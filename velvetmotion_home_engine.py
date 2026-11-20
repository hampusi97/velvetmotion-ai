#!/usr/bin/env python3
"""Run the same standalone Home Engine that VelvetMotion offers for download."""

from pathlib import Path
from runpy import run_path


if __name__ == "__main__":
    engine = Path(__file__).resolve().parent / "public" / "downloads" / "velvetmotion_home_engine.py"
    run_path(str(engine), run_name="__main__")
