"""Unit tests for the VelvetMotion autonomous coding agent (src/agent.py)."""

from __future__ import annotations

import os
import tempfile
import unittest
from typing import Dict, List

from src.agent import (
    TupleResult,
    apply_external_ai_blocks,
    is_public_https_url,
    is_refusal_response,
    read_file,
    replace_in_file,
    resolve_safe_path,
    run_agent_task,
    run_checks,
    search_code,
    write_file,
)
from src.utils import slugify_prompt


class TestAutonomousAgent(unittest.TestCase):
    def test_resolve_safe_path_blocks_traversal_and_protected_dirs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            valid = resolve_safe_path(tmp, "src/utils/helper.py")
            self.assertTrue(valid.startswith(os.path.realpath(tmp)))
            for unsafe in ("../outside.txt", "/etc/passwd", ".git/config", ".github/workflows/ci.yml"):
                with self.assertRaises(ValueError):
                    resolve_safe_path(tmp, unsafe)

    def test_is_public_https_url_blocks_insecure_or_loopback_targets(self) -> None:
        self.assertFalse(is_public_https_url("http://example.com"))
        self.assertFalse(is_public_https_url("https://127.0.0.1:8080/secret"))
        self.assertFalse(is_public_https_url("https://localhost/admin"))
        self.assertFalse(is_public_https_url("https://user:pass@example.com/path"))

    def test_is_refusal_response_detects_standard_refusals(self) -> None:
        self.assertTrue(is_refusal_response("I'm sorry, I can't assist with that request."))
        self.assertTrue(is_refusal_response("As an AI, I cannot generate this content."))
        self.assertFalse(is_refusal_response("def compute_score(x: int) -> int:\n    return x * 2"))

    def test_search_code_and_run_checks(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            write_file(tmp, "src/sample.py", "def magic_widget_fn() -> int:\n    return 42\n")
            write_file(
                tmp,
                "src/tests/test_sample.py",
                "import unittest\nfrom src.sample import magic_widget_fn\nclass T(unittest.TestCase):\n    def test_ok(self):\n        self.assertEqual(magic_widget_fn(), 42)\n",
            )
            hits = search_code(tmp, "magic_widget_fn")
            self.assertIn("src/sample.py", hits)
            checks_out = run_checks(tmp)
            self.assertIn("PASS", checks_out)

    def test_slugify_prompt_helper(self) -> None:
        from src.utils import truncate_prompt

        self.assertEqual(slugify_prompt("  Hello   Velvet World  "), "hello-velvet-world")
        self.assertEqual(truncate_prompt("short", max_len=10), "short")
        self.assertEqual(truncate_prompt("abcdefghijk", max_len=5), "abcd…")

    def test_apply_external_ai_blocks_writes_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            pasted = (
                "Here are your files:\n"
                "<<<FILE: src/demo/hello.py>>>\n"
                "def greet() -> str:\n"
                "    return 'hello'\n"
                "<<<END_FILE>>>\n"
            )
            modified = apply_external_ai_blocks(pasted, tmp)
            self.assertEqual(modified, ["src/demo/hello.py"])
            content = read_file(tmp, "src/demo/hello.py")
            self.assertIn("def greet() -> str:", content)

    def test_run_agent_task_executes_tools_and_applies_edits(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            write_file(tmp, "notes.txt", "status: old\n")
            calls = 0

            def fake_llm(messages: List[Dict[str, str]]) -> TupleResult:
                nonlocal calls
                calls += 1
                if calls == 1:
                    return TupleResult(
                        text=(
                            "Let me inspect and update notes.txt.\n"
                            '<<<TOOL>>>{"tool": "replace_in_file", "args": {"path": "notes.txt", "target": "status: old", "replacement": "status: updated"}}<<<END_TOOL>>>'
                        ),
                        provider="MockLLM",
                    )
                return TupleResult(
                    text="Updated notes.txt successfully.",
                    provider="MockLLM",
                )

            result = run_agent_task("Update notes.txt", workspace_root=tmp, max_steps=3, llm_fn=fake_llm)
            self.assertEqual(result.modified_files, ["notes.txt"])
            self.assertEqual(read_file(tmp, "notes.txt"), "status: updated\n")
            self.assertTrue(len(result.tool_logs) >= 1)

    def test_replace_in_file_raises_when_target_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            write_file(tmp, "a.txt", "alpha\n")
            with self.assertRaises(ValueError):
                replace_in_file(tmp, "a.txt", "missing", "beta")


if __name__ == "__main__":
    unittest.main()
