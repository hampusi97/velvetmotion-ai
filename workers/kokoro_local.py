#!/usr/bin/env python3
"""Loopback OpenAI-compatible speech adapter for Kokoro ONNX."""
from __future__ import annotations

import argparse
import io
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
import wave

DEFAULT_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "https://velvetmotion-ai.hampusi97.workers.dev,tauri://localhost,http://tauri.localhost"
)


class VoiceServer(ThreadingHTTPServer):
    def __init__(self, port, synthesizer):
        super().__init__(("127.0.0.1", port), VoiceHandler)
        self.synthesizer = synthesizer
        self.voices = frozenset(
            voice for voice in synthesizer.get_voices() if voice.startswith(("af_", "am_", "bf_", "bm_"))
        )
        self.origins = {
            origin.strip() for origin in os.environ.get("VELVET_VOICE_ORIGINS", DEFAULT_ORIGINS).split(",")
        }
        self.inference_lock = Lock()

    def wav(self, text: str, voice: str, speed: float) -> bytes:
        lang = "en-gb" if voice.startswith(("bf_", "bm_")) else "en-us"
        with self.inference_lock:
            samples, sample_rate = self.synthesizer.create(text, voice=voice, speed=speed, lang=lang)
        output = io.BytesIO()
        with wave.open(output, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes((samples.clip(-1.0, 1.0) * 32767).astype("<i2").tobytes())
        return output.getvalue()


class VoiceHandler(BaseHTTPRequestHandler):
    server: VoiceServer

    def send_payload(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")
        origin = self.headers.get("Origin")
        if origin and origin in self.server.origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def send_json(self, status: int, data: dict) -> None:
        self.send_payload(status, json.dumps(data).encode("utf-8"), "application/json")

    def origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        if not origin or origin in self.server.origins:
            return True
        self.send_json(403, {"error": "This origin is not allowed to use the local speech service."})
        return False

    def do_OPTIONS(self) -> None:
        if self.origin_allowed():
            self.send_payload(204, b"", "text/plain")

    def do_GET(self) -> None:
        if not self.origin_allowed():
            return
        if self.path in ("/health", "/docs"):
            self.send_json(200, {"status": "ready", "model": "kokoro", "voices": sorted(self.server.voices)})
        else:
            self.send_json(404, {"error": "Unknown speech route."})

    def do_POST(self) -> None:
        if not self.origin_allowed():
            return
        if self.path != "/v1/audio/speech":
            self.send_json(404, {"error": "Unknown speech route."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16_384:
                self.send_json(413, {"error": "Speech request exceeds the size limit or is empty."})
                return
            payload = json.loads(self.rfile.read(length))
            if payload.get("model", "kokoro") != "kokoro":
                raise ValueError("This service only runs the Kokoro model.")
            text = payload.get("input")
            voice = payload.get("voice", "af_heart")
            speed = float(payload.get("speed", 1))
            if not isinstance(text, str) or not text.strip() or len(text) > 900:
                raise ValueError("Supply 1–900 characters of speech text.")
            if not isinstance(voice, str) or voice not in self.server.voices:
                raise ValueError("Choose an installed Kokoro voice.")
            if not 0.5 <= speed <= 2:
                raise ValueError("Speech speed must be between 0.5 and 2.")
        except (ValueError, TypeError, AttributeError) as exc:
            self.send_json(400, {"error": str(exc)})
            return
        try:
            audio = self.server.wav(text.strip(), voice, speed)
        except Exception as exc:
            self.log_error("Kokoro inference failed: %s", type(exc).__name__)
            self.send_json(500, {"error": "Kokoro could not synthesize speech."})
            return
        self.send_payload(200, audio, "audio/wav")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Path to the Kokoro v1.0 ONNX file")
    parser.add_argument("--voices", required=True, help="Path to voices-v1.0.bin")
    parser.add_argument("--port", type=int, default=8880)
    args = parser.parse_args()

    import espeakng_loader
    import onnxruntime
    from kokoro_onnx import Kokoro
    from kokoro_onnx.config import EspeakConfig

    threads = onnxruntime.SessionOptions()
    threads.intra_op_num_threads = min(os.cpu_count() or 1, 3)
    threads.inter_op_num_threads = 1
    session = onnxruntime.InferenceSession(args.model, threads, providers=["CPUExecutionProvider"])
    espeak = EspeakConfig(espeakng_loader.get_library_path(), espeakng_loader.get_data_path())
    synth = Kokoro.from_session(session, args.voices, espeak_config=espeak)
    with VoiceServer(args.port, synth) as server:
        print(f"Kokoro CPU speech ready at http://127.0.0.1:{args.port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
