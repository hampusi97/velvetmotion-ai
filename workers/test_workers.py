#!/usr/bin/env python3
"""Unit & live HTTP tests for VelvetMotion Python workers (Telegram bridge & ComfyUI/Forge proxy)."""

import json
import tempfile
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from unittest.mock import Mock, patch

from public.downloads import velvetmotion_home_engine
from workers.local_media_proxy import LocalProxyHandler, build_comfy_workflow, run_comfy_generation
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

            ollama_body = {"model": "fixture", "messages": [{"role": "user", "content": "Hello"}]}
            ollama_req = urllib.request.Request(
                f"http://127.0.0.1:{port}/ollama/chat",
                data=json.dumps(ollama_body).encode(),
                headers={"Content-Type": "application/json"},
            )
            with patch("workers.local_media_proxy.forward_json", return_value={"done": True}) as forward:
                with urllib.request.urlopen(ollama_req, timeout=5) as resp:
                    self.assertEqual(json.load(resp), {"done": True})
                self.assertEqual(forward.call_args.args[1], {**ollama_body, "stream": False})
        finally:
            server.shutdown()
            server.server_close()

    def test_comfy_image_completed_without_output_stops_polling(self) -> None:
        history = {"job": {"status": {"completed": True}, "outputs": {}}}
        with (
            patch("workers.local_media_proxy.forward_json", return_value={"prompt_id": "job"}) as forward,
            patch("workers.local_media_proxy.urllib.request.urlopen", side_effect=[BytesIO(json.dumps(history).encode())]) as get_result,
            patch("workers.local_media_proxy.time.sleep"),
        ):
            self.assertIsNone(run_comfy_generation({"seed": 0}))
            self.assertEqual(forward.call_args.args[1]["prompt"]["3"]["inputs"]["seed"], 0)
            get_result.assert_called_once()

    def test_home_engine_tries_next_model_after_incomplete_reply(self) -> None:
        def chat_response(content):
            return BytesIO(json.dumps({"choices": [{"message": {"content": content}}]}).encode())

        handler = Mock()
        with (
            patch.object(velvetmotion_home_engine, "probe_engines", return_value={"koboldcpp": True, "ollama": True}),
            patch.object(velvetmotion_home_engine.urllib.request, "urlopen", side_effect=[
                chat_response("<think>Waiting for the rest"),
                chat_response("Here is the reply."),
            ]) as request,
        ):
            velvetmotion_home_engine.VelvetEngineHandler.handle_chat(handler, {})

        handler.send_json.assert_called_once_with(200, {"provider": "ollama", "reply": "Here is the reply."})
        self.assertEqual(request.call_count, 2)

    def test_comfy_video_bridge_queues_and_streams_result(self) -> None:
        from urllib.error import HTTPError
        from workers.comfy_video import queue_video

        job_id = "3f2c83c8-7ea8-4aa0-ac21-29ac0d35692d"
        with tempfile.TemporaryDirectory() as tmp_dir:
            workflow = Path(tmp_dir) / "workflow.json"
            workflow.write_text(json.dumps({
                "1": {"class_type": "LoadImage", "inputs": {"image": "{{image}}"}},
                "2": {"class_type": "VideoNode", "inputs": {"height": "{{resolution}}", "text": "{{prompt}}"}},
            }))
            payload = {
                "image": "data:image/png;base64,aGVsbG8=",
                "prompt": "Slow dolly in",
                "sourceType": "fictional",
                "resolution": 1080,
            }
            with patch("workers.comfy_video._upload_image", return_value="uploaded.png"):
                def forward(_url, body, timeout):
                    self.assertEqual(body["prompt"]["1"]["inputs"]["image"], "uploaded.png")
                    self.assertEqual(body["prompt"]["2"]["inputs"], {"height": 1080, "text": "Slow dolly in"})
                    return {"prompt_id": job_id}

                self.assertEqual(queue_video("http://localhost:8188", workflow, payload, forward), job_id)
                with self.assertRaisesRegex(ValueError, "fictional adult source"):
                    queue_video("http://localhost:8188", workflow, {
                        **payload, "sourceType": "real-person", "adultMode": True,
                    }, forward)

            class Clip(BytesIO):
                headers = {"Content-Length": "9"}

            server = ThreadingHTTPServer(("127.0.0.1", 0), LocalProxyHandler)
            base = f"http://127.0.0.1:{server.server_address[1]}"
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            open_url = urllib.request.urlopen

            def open_upstream(url, **kwargs):
                return Clip(b"test clip") if url == "http://localhost:8188/test-clip" else open_url(url, **kwargs)

            try:
                with (
                    patch.dict("os.environ", {"VELVET_COMFY_VIDEO_WORKFLOW": str(workflow), "VELVET_VIDEO_ORIGINS": "http://localhost:3000"}),
                    patch("workers.local_media_proxy.queue_video", return_value=job_id),
                    patch("workers.local_media_proxy.video_output", side_effect=[None, ("http://localhost:8188/test-clip", "video/mp4")]),
                    patch("workers.local_media_proxy.check_video_workflow") as check_health,
                    patch("workers.local_media_proxy.urllib.request.urlopen", side_effect=open_upstream),
                ):
                    headers = {"Content-Type": "application/json", "Origin": "http://localhost:3000"}
                    ready = urllib.request.Request(base + "/video/health", headers=headers)
                    with open_url(ready, timeout=5) as response:
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
                        self.assertEqual(json.load(response)["status"], "ready")
                    check_health.side_effect = RuntimeError("Missing video model weights.")
                    with self.assertRaises(HTTPError) as missing:
                        open_url(ready, timeout=5)
                    self.assertEqual(missing.exception.code, 503)
                    request = urllib.request.Request(base + "/generate-video", data=json.dumps(payload).encode(), headers=headers)
                    with open_url(request, timeout=5) as response:
                        self.assertEqual(response.status, 202)
                        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
                        job_url = base + json.load(response)["statusUrl"]
                    with open_url(job_url, timeout=5) as response:
                        self.assertEqual(response.status, 202)
                    with open_url(job_url, timeout=5) as response:
                        self.assertEqual(response.headers.get("Content-Type"), "video/mp4")
                        self.assertEqual(response.read(), b"test clip")
                    unauthorized = urllib.request.Request(base + "/generate-video", data=b"{}", headers={"Origin": "https://untrusted.example"})
                    with self.assertRaises(HTTPError) as denied:
                        open_url(unauthorized, timeout=5)
                    self.assertEqual(denied.exception.code, 403)
            finally:
                server.shutdown()
                server.server_close()

    def test_bundled_wan_graph_uses_requested_resolution_and_duration(self) -> None:
        from workers.comfy_video import WAN_VIDEO_WORKFLOW, check_video_workflow, load_video_workflow, queue_video

        comfy = "http://localhost:8188"
        graph = load_video_workflow(WAN_VIDEO_WORKFLOW)
        node_info = {node["class_type"]: {} for node in graph.values()}
        endpoints = {
            "/object_info": node_info,
            "/models/diffusion_models": ["wan2.2_ti2v_5B_fp16.safetensors"],
            "/models/text_encoders": ["umt5_xxl_fp8_e4m3fn_scaled.safetensors"],
            "/models/vae": ["wan2.2_vae.safetensors"],
        }

        def open_upstream(url, **_kwargs):
            return BytesIO(json.dumps(endpoints[url.removeprefix(comfy)]).encode())

        with patch("workers.comfy_video.urllib.request.urlopen", side_effect=open_upstream):
            check_video_workflow(comfy, WAN_VIDEO_WORKFLOW)
            endpoints["/models/vae"] = []
            with self.assertRaisesRegex(RuntimeError, "Missing wan2.2_vae.safetensors"):
                check_video_workflow(comfy, WAN_VIDEO_WORKFLOW)

        job_id = "a31b1993-4ed4-474e-a4fc-4322db51b35a"

        def forward(url, body, timeout):
            self.assertEqual(url, comfy + "/prompt")
            queued = body["prompt"]
            self.assertEqual(queued["1"]["inputs"]["image"], "source.png")
            self.assertEqual(queued["5"]["inputs"]["text"], "A slow turn")
            latent = queued["8"]["inputs"]
            self.assertEqual((latent["width"], latent["height"], latent["length"]), (480, 832, 73))
            self.assertEqual(queued["11"]["inputs"]["fps"], 18)
            self.assertEqual(queued["12"]["class_type"], "SaveVideo")
            return {"prompt_id": job_id}

        with patch("workers.comfy_video._upload_image", return_value="source.png"):
            payload = {"sourceType": "fictional", "prompt": "A slow turn", "resolution": 480, "durationSec": 3, "speed": 0.75}
            self.assertEqual(queue_video(comfy, WAN_VIDEO_WORKFLOW, payload, forward), job_id)
            with self.assertRaisesRegex(ValueError, "supports 480p and 720p"):
                queue_video(comfy, WAN_VIDEO_WORKFLOW, {**payload, "resolution": 1080}, forward)

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
