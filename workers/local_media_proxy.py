#!/usr/bin/env python3
"""
VelvetMotion AI — Local Media & ComfyUI / Forge / Ollama CORS Proxy

Solves browser CORS restrictions when VelvetMotion connects from the browser
to local image/video/LLM backends:
  - ComfyUI (default http://127.0.0.1:8188)
  - Stable Diffusion WebUI Forge / A1111 (default http://127.0.0.1:7860)
  - Ollama local LLM (default http://127.0.0.1:11434)

Usage:
  python3 workers/local_media_proxy.py --port 8787
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional

if __package__:
    from .comfy_video import (
        JOB_ID, MAX_REQUEST_BYTES, WAN_VIDEO_WORKFLOW, allowed_origin, check_video_workflow, queue_video, video_output,
    )
else:
    from comfy_video import (
        JOB_ID, MAX_REQUEST_BYTES, WAN_VIDEO_WORKFLOW, allowed_origin, check_video_workflow, queue_video, video_output,
    )

COMFY_BASE = os.environ.get("COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
FORGE_BASE = os.environ.get("FORGE_URL", "http://127.0.0.1:7860").rstrip("/")
OLLAMA_BASE = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
COMFY_CHECKPOINT = os.environ.get("COMFY_CHECKPOINT", "flux1-dev-fp8.safetensors")

DEFAULT_NEGATIVE = (
    "low quality, blurry, deformed, extra fingers, watermark, text, logo, underage, child"
)


def build_comfy_workflow(
    prompt: str,
    negative: str,
    seed: int,
    width: int,
    height: int,
    checkpoint: str = COMFY_CHECKPOINT,
    reference_image_b64: Optional[str] = None,
    ip_adapter_weight: float = 0.85,
) -> Dict[str, Any]:
    """Construct a ComfyUI txt2img KSampler graph with optional IP-Adapter FaceID lock."""
    has_ref = bool(reference_image_b64 and len(reference_image_b64) > 32)
    graph: Dict[str, Any] = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 5.5,
                "denoise": 1.0,
                "latent_image": ["5", 0],
                "model": ["11" if has_ref else "4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": "euler",
                "scheduler": "normal",
                "seed": int(seed),
                "steps": 22,
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"batch_size": 1, "height": int(height), "width": int(width)},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["4", 1], "text": prompt},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["4", 1], "text": negative or DEFAULT_NEGATIVE},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "VelvetMotion", "images": ["8", 0]},
        },
    }
    if has_ref and reference_image_b64:
        clean_b64 = reference_image_b64.split(",", 1)[-1] if "," in reference_image_b64 else reference_image_b64
        graph["10"] = {
            "class_type": "ETN_LoadImageBase64",
            "inputs": {"image": clean_b64},
        }
        graph["11"] = {
            "class_type": "IPAdapterUnifiedLoaderFaceID",
            "inputs": {
                "model": ["4", 0],
                "preset": "FACEID PLUS V2",
                "lora_strength": 0.65,
                "provider": "CUDA",
                "image": ["10", 0],
                "weight": float(ip_adapter_weight),
            },
        }
    return graph


def forward_json(url: str, payload: Dict[str, Any], timeout: int = 120) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_comfy_generation(payload: Dict[str, Any]) -> Optional[str]:
    prompt = str(payload.get("prompt") or "beautiful adult woman portrait")
    negative = str(payload.get("negative_prompt") or DEFAULT_NEGATIVE)
    seed = int(payload.get("seed") or int(time.time()))
    width = int(payload.get("width") or 768)
    height = int(payload.get("height") or 1152)

    workflow = build_comfy_workflow(prompt, negative, seed, width, height)
    queued = forward_json(f"{COMFY_BASE}/prompt", {"prompt": workflow})
    prompt_id = queued.get("prompt_id")
    if not prompt_id:
        return None

    deadline = time.time() + 110
    while time.time() < deadline:
        time.sleep(1.2)
        with urllib.request.urlopen(f"{COMFY_BASE}/history/{prompt_id}", timeout=15) as resp:
            history = json.loads(resp.read().decode("utf-8"))
        item = history.get(prompt_id)
        if not item:
            continue
        outputs = item.get("outputs") or {}
        for node_out in outputs.values():
            images = node_out.get("images") or []
            if images:
                img = images[0]
                q = urllib.parse.urlencode(
                    {
                        "filename": img.get("filename", ""),
                        "subfolder": img.get("subfolder", ""),
                        "type": img.get("type", "output"),
                    }
                )
                with urllib.request.urlopen(f"{COMFY_BASE}/view?{q}", timeout=20) as view_resp:
                    raw_bytes = view_resp.read()
                b64 = base64.b64encode(raw_bytes).decode("ascii")
                return f"data:image/png;base64,{b64}"
    return None


class LocalProxyHandler(BaseHTTPRequestHandler):
    def _is_video_route(self) -> bool:
        return self.path in ("/generate-video", "/video/health") or self.path.startswith("/video/jobs/")

    def _send_cors_headers(self) -> None:
        if self._is_video_route():
            origin = self.headers.get("Origin")
            self.send_header("Vary", "Origin")
            if origin and allowed_origin(origin):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Expose-Headers", "Location, Retry-After")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, status: int, data: Dict[str, Any], *, retry_after: str | None = None) -> None:
        raw = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        if retry_after:
            self.send_header("Retry-After", retry_after)
        self.end_headers()
        self.wfile.write(raw)

    def _video_available(self) -> str | None:
        if not allowed_origin(self.headers.get("Origin")):
            self._send_json(403, {"error": "This origin is not allowed to use the local video renderer."})
            return None
        workflow = os.environ.get("VELVET_COMFY_VIDEO_WORKFLOW")
        if not workflow:
            self._send_json(503, {"error": "Set VELVET_COMFY_VIDEO_WORKFLOW to your exported ComfyUI video workflow."})
        return workflow

    def _video_health(self) -> None:
        workflow = self._video_available()
        if not workflow:
            return
        try:
            check_video_workflow(COMFY_BASE, workflow)
        except (ValueError, RuntimeError) as exc:
            self._send_json(503, {"error": str(exc)})
        except FileNotFoundError:
            self._send_json(503, {"error": "The video workflow file could not be found."})
        except OSError:
            self._send_json(503, {"error": "Start ComfyUI and check its address before testing the video bridge."})
        else:
            self._send_json(200, {"status": "ready", "detail": "Workflow nodes and video model files found in ComfyUI."})

    def _queue_video(self) -> None:
        workflow = self._video_available()
        if not workflow:
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_REQUEST_BYTES:
                self._send_json(413, {"error": "Video source exceeds the request limit or is missing."})
                return
            payload = json.loads(self.rfile.read(length))
            job_id = queue_video(COMFY_BASE, workflow, payload, forward_json)
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
        except (OSError, KeyError, RuntimeError):
            self._send_json(502, {"error": "Could not queue the video in ComfyUI. Check the workflow and model setup."})
        else:
            self._send_json(202, {"statusUrl": f"/video/jobs/{job_id}"}, retry_after="3")

    def _serve_video_job(self) -> None:
        if not self._video_available():
            return
        job_id = self.path.removeprefix("/video/jobs/")
        if not JOB_ID.fullmatch(job_id):
            self._send_json(404, {"error": "Unknown video job."})
            return
        try:
            output = video_output(COMFY_BASE, job_id)
            if not output:
                self._send_json(202, {"status": "rendering"}, retry_after="3")
                return
            url, content_type = output
            response = urllib.request.urlopen(url, timeout=30)
        except RuntimeError as exc:
            self._send_json(502, {"error": str(exc)})
            return
        except (OSError, ValueError):
            self._send_json(502, {"error": "Could not fetch the rendered video from ComfyUI."})
            return
        with response:
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", content_type)
            length = response.headers.get("Content-Length")
            if length:
                self.send_header("Content-Length", length)
            self.end_headers()
            try:
                shutil.copyfileobj(response, self.wfile)
            except (BrokenPipeError, ConnectionResetError):
                return

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/video/jobs/"):
            self._serve_video_job()
            return
        if self.path == "/video/health":
            self._video_health()
            return
        if self.path.startswith("/health"):
            self._send_json(
                200,
                {
                    "ok": True,
                    "service": "velvetmotion-local-media-proxy",
                    "targets": {
                        "comfy": COMFY_BASE,
                        "forge": FORGE_BASE,
                        "ollama": OLLAMA_BASE,
                    },
                },
            )
            return
        self._send_json(404, {"error": "Not found. Use GET /health or POST /generate, /sdapi/v1/txt2img, /ollama/chat."})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/generate-video":
            self._queue_video()
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        if self.path.startswith("/sdapi/v1/txt2img"):
            try:
                res = forward_json(f"{FORGE_BASE}/sdapi/v1/txt2img", payload)
                self._send_json(200, res)
            except Exception as exc:
                self._send_json(502, {"error": f"Forge upstream failed: {exc}"})
            return

        if self.path.startswith("/ollama/chat"):
            try:
                res = forward_json(f"{OLLAMA_BASE}/api/chat", payload)
                self._send_json(200, res)
            except Exception as exc:
                self._send_json(502, {"error": f"Ollama upstream failed: {exc}"})
            return

        # Default unified image generator endpoint: tries ComfyUI first, then Forge
        try:
            comfy_img = run_comfy_generation(payload)
            if comfy_img:
                self._send_json(200, {"ok": True, "url": comfy_img, "source": "comfyui"})
                return
        except Exception:
            pass

        try:
            forge_res = forward_json(f"{FORGE_BASE}/sdapi/v1/txt2img", payload)
            images = forge_res.get("images") or []
            if images:
                b64 = images[0]
                url = b64 if b64.startswith("data:") else f"data:image/png;base64,{b64}"
                self._send_json(200, {"ok": True, "url": url, "source": "forge"})
                return
        except Exception as exc:
            self._send_json(
                502,
                {
                    "ok": False,
                    "error": f"Neither ComfyUI ({COMFY_BASE}) nor Forge ({FORGE_BASE}) responded: {exc}",
                },
            )
            return

        self._send_json(502, {"ok": False, "error": "No image returned from local backends"})


def main() -> int:
    parser = argparse.ArgumentParser(description="VelvetMotion local media CORS proxy")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8787, help="Bind port (default: 8787)")
    parser.add_argument("--wan-video", action="store_true", help="Enable the bundled Wan2.2 5B video workflow")
    args = parser.parse_args()
    if args.wan_video:
        os.environ.setdefault("VELVET_COMFY_VIDEO_WORKFLOW", str(WAN_VIDEO_WORKFLOW))

    server = ThreadingHTTPServer((args.host, args.port), LocalProxyHandler)
    print(
        f"[VelvetMotion Local Media Proxy] Listening on http://{args.host}:{args.port}\n"
        f"  -> ComfyUI : {COMFY_BASE}\n"
        f"  -> Forge   : {FORGE_BASE}\n"
        f"  -> Ollama  : {OLLAMA_BASE}"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down proxy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
