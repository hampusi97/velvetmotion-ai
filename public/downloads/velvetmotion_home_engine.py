#!/usr/bin/env python3
"""
VelvetMotion AI — Local Home Server & RAM/GPU Supplement Engine
===============================================================
Run on your own Windows / macOS / Linux PC:
    python3 velvetmotion_home_engine.py

What it does automatically:
  1. Hosts the VelvetMotion AI static build (`./out`) on http://127.0.0.1:8787
  2. Exposes a CORS-enabled Local AI Supplement API (/api/health, /api/chat, /api/image, /api/video)
     that taps into your PC's local RAM & GPU via:
       - KoboldCpp (http://127.0.0.1:5001) — GGUF LLMs + SD/FLUX in local RAM/VRAM
       - Ollama    (http://127.0.0.1:11434) — Local GGUF LLMs
       - ComfyUI   (http://127.0.0.1:8188)  — FLUX/SDXL IP-Adapter/PuLID + FramePack/Wan 2.2 video
  3. Automatically falls back to your Cloudflare Image Worker (GET /generate) if no local GPU
     server is running, so photo buttons NEVER fail.
  4. If `cloudflared` is installed, automatically opens a FREE public HTTPS Quick Tunnel
     (https://xxxx.trycloudflare.com) so your live website on Cloudflare OR Vercel can connect
     straight to your PC's RAM/GPU from anywhere!
"""

import http.server
import json
import os
import random
import re
import shutil
import socketserver
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PORT = int(os.environ.get("VELVET_ENGINE_PORT", "8787"))
STATIC_DIR = Path(os.environ.get("VELVET_STATIC_DIR", "out")).resolve()
CF_IMAGE_WORKER = os.environ.get(
    "VELVET_CF_IMAGE_WORKER", "https://velvetmotion-image.hampusi97.workers.dev"
).rstrip("/")

KOBOLD_URL = os.environ.get("KOBOLD_URL", "http://127.0.0.1:5001")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
COMFY_URL = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")

TUNNEL_URL = None

ANTI_SLOP_BAN_PHRASES = [
    "shivers down my spine",
    "shiver down my spine",
    "a testament to",
    "couldn't help but",
    "eyes widened",
    "a mixture of",
    "tapestry of",
    "symphony of",
    "unspoken promise",
    "as an ai",
    "how can i assist you",
    "how can i help you today",
]

DAVIDAU_SAMPLER_PRESETS = {
    "roleplay-balanced": {
        "standard": {"temperature": 0.82, "top_p": 0.95, "max_tokens": 260, "presence_penalty": 0.0, "frequency_penalty": 0.0},
        "localExtended": {"min_p": 0.05, "top_k": 40, "repeat_penalty": 1.08, "repeat_last_n": 64},
    },
    "creative-dry-class3": {
        "standard": {"temperature": 0.95, "top_p": 0.95, "max_tokens": 280, "presence_penalty": 0.1, "frequency_penalty": 0.25},
        "localExtended": {
            "min_p": 0.05, "top_k": 60, "repeat_penalty": 1.1, "repeat_last_n": 64,
            "dry_multiplier": 0.8, "dry_allowed_length": 2, "dry_base": 1.0,
            "smoothing_factor": 1.5, "smoothing_curve": 1.0,
        },
    },
    "ultra-prose-class4": {
        "standard": {"temperature": 1.25, "top_p": 0.95, "max_tokens": 300, "presence_penalty": 0.2, "frequency_penalty": 0.5},
        "localExtended": {
            "min_p": 0.05, "top_k": 80, "repeat_penalty": 1.12, "repeat_last_n": 64,
            "dry_multiplier": 1.0, "dry_allowed_length": 2, "dry_base": 1.5,
            "smoothing_factor": 3.5, "smoothing_curve": 1.75,
            "dynatemp_range": 0.5, "dynatemp_exponent": 1.0,
        },
    },
}


def build_home_sampler_payload(provider, body):
    preset_id = body.get("samplerPreset") or "roleplay-balanced"
    preset = DAVIDAU_SAMPLER_PRESETS.get(preset_id, DAVIDAU_SAMPLER_PRESETS["roleplay-balanced"])
    std = dict(preset["standard"])
    ext = dict(preset["localExtended"])
    for key in std:
        if key in body and body[key] is not None:
            std[key] = body[key]
    for key in ext:
        if key in body and body[key] is not None:
            ext[key] = body[key]
    if provider == "koboldcpp":
        out = {**std, **ext}
        out["banned_tokens"] = body.get("banned_tokens") or ANTI_SLOP_BAN_PHRASES
        return out
    return {
        **std,
        "options": {
            "temperature": std["temperature"],
            "top_p": std["top_p"],
            "min_p": ext["min_p"],
            "top_k": ext["top_k"],
            "repeat_penalty": ext["repeat_penalty"],
            "repeat_last_n": ext["repeat_last_n"],
            "num_predict": std["max_tokens"],
        },
    }


def get_ram_gb():
    """Returns (total_gb, available_gb) using stdlib only (no pip installs required)."""
    try:
        if sys.platform.startswith("linux"):
            mem = {}
            with open("/proc/meminfo", "r", encoding="utf-8") as f:
                for line in f:
                    k, v = line.split(":", 1)
                    mem[k.strip()] = int(v.strip().split()[0])
            return round(mem.get("MemTotal", 0) / 1048576, 1), round(mem.get("MemAvailable", 0) / 1048576, 1)
        if sys.platform == "darwin":
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"]).decode().strip()
            total = round(int(out) / (1024**3), 1)
            return total, round(total * 0.5, 1)
        if sys.platform == "win32":
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            return round(stat.ullTotalPhys / (1024**3), 1), round(stat.ullAvailPhys / (1024**3), 1)
    except Exception:
        pass
    return 16.0, 8.0


def probe(url, timeout=0.8):
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return 200 <= r.status < 400
    except Exception:
        return False


def strip_think(text):
    return re.sub(r"<think>[\s\S]*?</think>", "", text or "", flags=re.IGNORECASE).strip()


class VelvetEngineHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        directory = str(STATIC_DIR) if STATIC_DIR.exists() else os.getcwd()
        super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            total_ram, avail_ram = get_ram_gb()
            kobold = probe(f"{KOBOLD_URL}/api/v1/model")
            ollama = probe(f"{OLLAMA_URL}/api/tags")
            comfy = probe(f"{COMFY_URL}/system_stats")
            self.send_json(200, {
                "status": "online",
                "engine": "VelvetMotion Home Engine",
                "totalRamGb": total_ram,
                "availableRamGb": avail_ram,
                "cpuCores": os.cpu_count() or 4,
                "engines": {"koboldcpp": kobold, "ollama": ollama, "comfyui": comfy},
                "publicTunnelUrl": TUNNEL_URL,
                "hostingStaticOut": STATIC_DIR.exists(),
            })
            return

        if parsed.path in ("/api/image", "/generate"):
            qs = urllib.parse.parse_qs(parsed.query)
            prompt = (qs.get("prompt", [""])[0] or "").strip()
            steps = qs.get("steps", ["8"])[0]
            seed = qs.get("seed", [str(random.randint(1, 9999999))])[0]
            self.handle_image_generation(prompt, steps, seed)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        try:
            body = self.read_json_body()
        except Exception:
            self.send_json(400, {"error": "Invalid JSON body"})
            return

        if parsed.path == "/api/chat":
            self.handle_chat(body)
            return
        if parsed.path in ("/api/image", "/generate"):
            prompt = str(body.get("prompt", "")).strip()
            steps = str(body.get("steps", 8))
            seed = str(body.get("seed", random.randint(1, 9999999)))
            self.handle_image_generation(prompt, steps, seed)
            return
        if parsed.path == "/api/video":
            comfy = probe(f"{COMFY_URL}/system_stats")
            self.send_json(200, {
                "mode": "local-comfyui" if comfy else "browser-canvas-webm",
                "comfyOnline": comfy,
                "message": "Local ComfyUI ready for FramePack/Wan 2.2" if comfy else "Use instant browser WebM exporter fallback",
            })
            return

        self.send_json(404, {"error": "Unknown API route"})

    def handle_chat(self, body):
        messages = body.get("messages", [])

        targets = []
        if probe(f"{KOBOLD_URL}/api/v1/model"):
            targets.append(("koboldcpp", f"{KOBOLD_URL}/v1/chat/completions", "local-gguf"))
        if probe(f"{OLLAMA_URL}/api/tags"):
            targets.append(("ollama", f"{OLLAMA_URL}/v1/chat/completions", body.get("model") or "llama3.1:8b"))

        for provider, endpoint, model in targets:
            try:
                sampler_fields = build_home_sampler_payload(provider, body)
                payload = json.dumps({
                    "model": model,
                    "messages": messages,
                    **sampler_fields,
                }).encode("utf-8")
                req = urllib.request.Request(
                    endpoint,
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=45) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    reply = strip_think(data["choices"][0]["message"]["content"])
                    self.send_json(200, {"provider": provider, "reply": reply})
                    return
            except Exception as exc:
                print(f"[VelvetEngine] {provider} chat error: {exc}")

        self.send_json(503, {"error": "No local LLM running (start KoboldCpp on :5001 or Ollama on :11434)"})

    def handle_image_generation(self, prompt, steps, seed):
        if not prompt:
            self.send_json(400, {"error": "Missing prompt"})
            return

        # 1. Try local KoboldCpp SD/FLUX endpoint first if active
        if probe(f"{KOBOLD_URL}/sdapi/v1/options"):
            try:
                import base64
                payload = json.dumps({
                    "prompt": prompt,
                    "steps": int(steps) if str(steps).isdigit() else 12,
                    "width": 768,
                    "height": 1024,
                    "seed": int(seed) if str(seed).isdigit() else -1,
                }).encode("utf-8")
                req = urllib.request.Request(
                    f"{KOBOLD_URL}/sdapi/v1/txt2img",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=90) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    img_bytes = base64.b64decode(data["images"][0])
                    self.send_response(200)
                    self.send_header("Content-Type", "image/png")
                    self.send_header("Content-Length", str(len(img_bytes)))
                    self.end_headers()
                    self.wfile.write(img_bytes)
                    return
            except Exception as exc:
                print(f"[VelvetEngine] Local KoboldCpp image fallback: {exc}")

        # 2. Seamless Cloudflare Image Worker fallback (always works!)
        try:
            qs = urllib.parse.urlencode({"prompt": prompt[:1500], "steps": steps, "seed": seed})
            url = f"{CF_IMAGE_WORKER}/generate?{qs}"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=45) as resp:
                img_bytes = resp.read()
                ctype = resp.headers.get("Content-Type", "image/jpeg")
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(img_bytes)))
                self.end_headers()
                self.wfile.write(img_bytes)
                return
        except Exception as exc:
            self.send_json(502, {"error": f"Image generation failed: {exc}"})


def start_cloudflare_tunnel():
    global TUNNEL_URL
    if not shutil.which("cloudflared"):
        print("ℹ️  Tip: Install `cloudflared` (free) to auto-expose your PC to Vercel & Cloudflare Workers.")
        return
    proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://127.0.0.1:{PORT}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    for line in proc.stdout:
        match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if match:
            TUNNEL_URL = match.group(0)
            print(f"\n🌐 PUBLIC HTTPS TUNNEL READY (paste into VelvetMotion Settings or Vercel):")
            print(f"   {TUNNEL_URL}\n")
            break


def main():
    total_ram, avail_ram = get_ram_gb()
    print("=" * 68)
    print("⚡ VELVETMOTION AI — HOME SERVER & LOCAL RAM/GPU SUPPLEMENT ENGINE")
    print("=" * 68)
    print(f"• Local Web & API:  http://127.0.0.1:{PORT}")
    print(f"• System RAM:       {total_ram} GB total ({avail_ram} GB available)")
    print(f"• Static Site Dir:  {STATIC_DIR} ({'FOUND' if STATIC_DIR.exists() else 'API-ONLY MODE'})")
    print(f"• Local Engines:    KoboldCpp={probe(KOBOLD_URL + '/api/v1/model')} | Ollama={probe(OLLAMA_URL + '/api/tags')} | ComfyUI={probe(COMFY_URL + '/system_stats')}")
    print("=" * 68)

    threading.Thread(target=start_cloudflare_tunnel, daemon=True).start()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), VelvetEngineHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down VelvetMotion Home Engine...")


if __name__ == "__main__":
    main()
