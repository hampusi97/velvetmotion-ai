#!/usr/bin/env python3
"""Unit & live HTTP tests for VelvetMotion Python workers (Telegram bridge & ComfyUI/Forge proxy)."""

import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer

from workers.local_media_proxy import LocalProxyHandler, build_comfy_workflow
from workers.telegram_bridge import ChatSessionState, VelvetTelegramBridge


class TestVelvetWorkers(unittest.TestCase):
    def test_comfy_workflow_graph_structure_and_ip_adapter(self) -> None:
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
        self.assertEqual(wf["3"]["inputs"]["model"], ["4", 0])
        self.assertEqual(wf["3"]["inputs"]["seed"], 12345)
        self.assertNotIn("11", wf)

        ref_b64 = "data:image/png;base64," + ("A" * 64)
        wf_ip = build_comfy_workflow(
            prompt="beautiful adult woman portrait",
            negative="blurry",
            seed=777,
            width=768,
            height=1152,
            reference_image_b64=ref_b64,
            ip_adapter_weight=0.9,
        )
        self.assertIn("10", wf_ip)
        self.assertIn("11", wf_ip)
        self.assertEqual(wf_ip["3"]["inputs"]["model"], ["11", 0])
        self.assertEqual(wf_ip["11"]["class_type"], "IPAdapterUnifiedLoaderFaceID")
        self.assertEqual(wf_ip["11"]["inputs"]["weight"], 0.9)

    def test_local_media_proxy_live_http_and_cors(self) -> None:
        server = ThreadingHTTPServer(("127.0.0.1", 0), LocalProxyHandler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=5) as resp:
                self.assertEqual(resp.status, 200)
                self.assertEqual(resp.headers.get("Access-Control-Allow-Origin"), "*")
                body = json.loads(resp.read().decode("utf-8"))
                self.assertTrue(body.get("ok"))
                self.assertEqual(body.get("service"), "velvetmotion-local-media-proxy")
                self.assertIn("comfy", body.get("targets", {}))

            opt_req = urllib.request.Request(
                f"http://127.0.0.1:{port}/generate", method="OPTIONS"
            )
            with urllib.request.urlopen(opt_req, timeout=5) as opt_resp:
                self.assertEqual(opt_resp.status, 204)
                self.assertEqual(opt_resp.headers.get("Access-Control-Allow-Origin"), "*")
        finally:
            server.shutdown()
            server.server_close()

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
