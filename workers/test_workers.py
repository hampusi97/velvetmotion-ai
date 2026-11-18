#!/usr/bin/env python3
"""Unit tests for VelvetMotion Python workers (Telegram bridge & ComfyUI/Forge proxy)."""

import unittest
from workers.local_media_proxy import build_comfy_workflow
from workers.telegram_bridge import ChatSessionState, VelvetTelegramBridge


class TestVelvetWorkers(unittest.TestCase):
    def test_comfy_workflow_graph_structure(self) -> None:
        wf = build_comfy_workflow(
            prompt="beautiful adult woman portrait, cinematic light",
            negative="blurry",
            seed=12345,
            width=768,
            height=1152,
            checkpoint="flux1-dev-fp8.safetensors",
        )
        self.assertIn("3", wf)
        self.assertEqual(wf["3"]["class_type"], "KSampler")
        self.assertEqual(wf["3"]["inputs"]["seed"], 12345)
        self.assertEqual(wf["5"]["inputs"]["width"], 768)
        self.assertEqual(wf["5"]["inputs"]["height"], 1152)
        self.assertEqual(
            wf["6"]["inputs"]["text"],
            "beautiful adult woman portrait, cinematic light",
        )

    def test_telegram_session_history_window(self) -> None:
        bridge = VelvetTelegramBridge(
            bot_token="123456:TEST_TOKEN",
            velvet_base_url="http://localhost:3000",
            default_character_id="maren",
        )
        session: ChatSessionState = bridge.get_session(999)
        self.assertEqual(session.character_id, "maren")
        for i in range(20):
            session.append("user", f"msg-{i}")
        self.assertEqual(len(session.messages), 16)
        self.assertEqual(session.messages[0]["content"], "msg-4")
        self.assertEqual(session.messages[-1]["content"], "msg-19")


if __name__ == "__main__":
    unittest.main()
