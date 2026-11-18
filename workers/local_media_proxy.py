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
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional

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
) -> Dict[str, Any]:
    """Construct a standard ComfyUI txt2img KSampler graph."""
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 5.5,
                "denoise": 1.0,
                "latent_image": ["5", 0],
                "model": ["4", 0],
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
    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, status: int, data: Dict[str, Any]) -> None:
        raw = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
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
    args = parser.parse_args()

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
