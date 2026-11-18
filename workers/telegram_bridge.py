#!/usr/bin/env python3
"""
VelvetMotion AI — Telegram Companion Bridge Worker (MyGirlGPT Pattern)

Connects a Telegram bot (@BotFather token) to VelvetMotion AI's chat, photo,
and motion-sequence endpoints so users can chat with any 21+ fictional
companion directly from Telegram.

Environment variables:
  BOT_TOKEN              Telegram Bot API token (required)
  VELVET_BASE_URL        Base URL of VelvetMotion deployment (default: http://localhost:3000)
  DEFAULT_CHARACTER_ID   Default companion ID (default: maren)
  POLL_TIMEOUT           Long-polling timeout in seconds (default: 25)
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ChatSessionState:
    character_id: str
    romance_mode: bool = False
    intimacy: int = 55
    messages: List[Dict[str, str]] = field(default_factory=list)

    def append(self, role: str, content: str) -> None:
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > 16:
            self.messages = self.messages[-16:]


class VelvetTelegramBridge:
    def __init__(
        self,
        bot_token: str,
        velvet_base_url: str = "http://localhost:3000",
        default_character_id: str = "maren",
    ) -> None:
        self.bot_token = bot_token.strip()
        self.velvet_base_url = velvet_base_url.rstrip("/")
        self.default_character_id = default_character_id.strip() or "maren"
        self.telegram_api = f"https://api.telegram.org/bot{self.bot_token}"
        self.sessions: Dict[int, ChatSessionState] = {}
        self.offset: int = 0

    def get_session(self, chat_id: int) -> ChatSessionState:
        if chat_id not in self.sessions:
            self.sessions[chat_id] = ChatSessionState(
                character_id=self.default_character_id
            )
        return self.sessions[chat_id]

    def _http_json(
        self,
        url: str,
        payload: Optional[Dict[str, Any]] = None,
        timeout: int = 35,
    ) -> Dict[str, Any]:
        data = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def send_message(self, chat_id: int, text: str) -> None:
        try:
            self._http_json(
                f"{self.telegram_api}/sendMessage",
                {"chat_id": chat_id, "text": text[:4000]},
            )
        except Exception as exc:
            print(f"[telegram] sendMessage error: {exc}", file=sys.stderr)

    def send_photo(self, chat_id: int, photo_url: str, caption: str = "") -> None:
        try:
            self._http_json(
                f"{self.telegram_api}/sendPhoto",
                {
                    "chat_id": chat_id,
                    "photo": photo_url,
                    "caption": caption[:1024],
                },
            )
        except Exception:
            self.send_message(chat_id, f"{caption}\n{photo_url}".strip())

    def request_chat_reply(self, session: ChatSessionState, user_text: str) -> str:
        session.append("user", user_text)
        try:
            res = self._http_json(
                f"{self.velvet_base_url}/api/chat",
                {
                    "characterId": session.character_id,
                    "messages": session.messages,
                    "romanceMode": session.romance_mode,
                    "intimacy": session.intimacy,
                },
            )
            reply = str(res.get("reply") or "").strip()
            if reply:
                session.append("assistant", reply)
                session.intimacy = min(100, session.intimacy + 3)
                return reply
        except Exception as exc:
            print(f"[velvet] /api/chat error: {exc}", file=sys.stderr)

        fallback = f"*{session.character_id.capitalize()} leans closer.* Tell me more about what you want tonight."
        session.append("assistant", fallback)
        return fallback

    def request_image(self, session: ChatSessionState, mood: str) -> Optional[str]:
        try:
            res = self._http_json(
                f"{self.velvet_base_url}/api/generate-image",
                {
                    "characterId": session.character_id,
                    "type": mood,
                },
            )
            return res.get("url")
        except Exception as exc:
            print(f"[velvet] /api/generate-image error: {exc}", file=sys.stderr)
            return None

    def handle_command(self, chat_id: int, text: str) -> None:
        session = self.get_session(chat_id)
        parts = text.strip().split(maxsplit=1)
        cmd = parts[0].lower().split("@")[0]
        arg = parts[1].strip() if len(parts) > 1 else ""

        if cmd == "/start":
            self.send_message(
                chat_id,
                (
                    f"VelvetMotion AI Companion Bridge active.\n"
                    f"Current companion: {session.character_id} (intimacy {session.intimacy}%)\n\n"
                    f"Commands:\n"
                    f"/girl <id> — switch companion (e.g. maren, liora, tess, isolde, briony, calla, nadine, vesper)\n"
                    f"/photo [portrait|lingerie|nude|explicit] — request a companion photo\n"
                    f"/romance — toggle romance mode\n"
                    f"/reset — clear conversation history"
                ),
            )
            return

        if cmd == "/girl":
            if not arg:
                self.send_message(
                    chat_id,
                    f"Active companion: {session.character_id}. Usage: /girl <character_id>",
                )
                return
            session.character_id = arg.lower().strip()
            session.messages.clear()
            self.send_message(
                chat_id,
                f"Switched companion to '{session.character_id}'. Say hi to begin.",
            )
            return

        if cmd == "/romance":
            session.romance_mode = not session.romance_mode
            mode = "ON" if session.romance_mode else "OFF"
            self.send_message(chat_id, f"Romance mode is now {mode}.")
            return

        if cmd == "/reset":
            session.messages.clear()
            self.send_message(chat_id, "Conversation memory cleared.")
            return

        if cmd == "/photo":
            mood = arg.lower() if arg.lower() in {"portrait", "lingerie", "nude", "explicit"} else "lingerie"
            self.send_message(chat_id, f"Generating {mood} photo for {session.character_id}…")
            url = self.request_image(session, mood)
            if url:
                self.send_photo(chat_id, url, f"{session.character_id.capitalize()} ({mood})")
            else:
                self.send_message(chat_id, "Could not generate image right now.")
            return

        self.send_message(chat_id, "Unknown command. Use /start for available commands.")

    def poll_forever(self, poll_timeout: int = 25) -> None:
        print(
            f"[VelvetMotion Telegram Bridge] Polling updates -> {self.velvet_base_url} "
            f"(default companion: {self.default_character_id})"
        )
        while True:
            try:
                query = urllib.parse.urlencode(
                    {"offset": self.offset, "timeout": poll_timeout}
                )
                data = self._http_json(
                    f"{self.telegram_api}/getUpdates?{query}",
                    timeout=poll_timeout + 10,
                )
                for update in data.get("result", []):
                    self.offset = max(self.offset, int(update["update_id"]) + 1)
                    msg = update.get("message") or {}
                    chat = msg.get("chat") or {}
                    chat_id = chat.get("id")
                    text = str(msg.get("text") or "").strip()
                    if not chat_id or not text:
                        continue
                    if text.startswith("/"):
                        self.handle_command(int(chat_id), text)
                    else:
                        reply = self.request_chat_reply(self.get_session(int(chat_id)), text)
                        self.send_message(int(chat_id), reply)
            except KeyboardInterrupt:
                print("\nShutting down Telegram bridge.")
                break
            except urllib.error.URLError as exc:
                print(f"[poll] network error: {exc}; retrying in 5s", file=sys.stderr)
                time.sleep(5)
            except Exception as exc:
                print(f"[poll] unexpected error: {exc}; retrying in 3s", file=sys.stderr)
                time.sleep(3)


def main() -> int:
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token:
        print(
            "Error: BOT_TOKEN environment variable is required.\n"
            "Example: BOT_TOKEN=123456:ABC... python3 workers/telegram_bridge.py",
            file=sys.stderr,
        )
        return 1
    base_url = os.environ.get("VELVET_BASE_URL") or os.environ.get(
        "VELVET_API_URL", "http://localhost:3000"
    )
    if base_url.endswith("/api/chat"):
        base_url = base_url[: -len("/api/chat")]
    default_char = os.environ.get("DEFAULT_CHARACTER_ID", "maren")
    poll_timeout = int(os.environ.get("POLL_TIMEOUT", "25"))

    bridge = VelvetTelegramBridge(
        bot_token=token,
        velvet_base_url=base_url,
        default_character_id=default_char,
    )
    bridge.poll_forever(poll_timeout=poll_timeout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
