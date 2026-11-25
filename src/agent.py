"""Autonomous self-healing multi-tool coding agent for VelvetMotion AI.

Capabilities:
1. Native OpenAI function calling (`tools` schema) + text `<<<TOOL>>>` / `<<<FILE: ...>>>` blocks.
2. Codebase search (`search_code`), directory listing (`list_files`), file reading (`read_file`),
   targeted edits (`replace_in_file`), full file creation (`write_file`), and test/typecheck
   execution (`run_checks`).
3. Web search (`web_search`) and SSRF-safe HTTPS downloading (`fetch_url`).
4. 4-Tier Resilient & Uncensored LLM Router:
   - Tier 1: OpenRouter (`UNCENSORED_AI_API_KEY` or `OPENROUTER_API_KEY`, default Dolphin 24B)
   - Tier 2: Keyless GPU Coding LLM (`text.pollinations.ai/openai`) with automatic `HTTP 402/429`
     `"Retry after Ns"` cooldown wait AND automatic refusal detection
   - Tier 3: Local Uncensored Ollama (`http://127.0.0.1:11434/v1/chat/completions`, e.g.
     `dolphin-mistral:7b` running directly inside the GitHub Actions runner)
   - Tier 4: Deterministic `src.velvetmotion` fallback
5. Automatic syntax & TypeScript verification (`verify_workspace_changes`) that rolls back broken
   edits so `main` stays green.
"""

from __future__ import annotations

import ipaddress
import json
import os
import re
import socket
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from src.velvetmotion import generate_response

FILE_BLOCK_RE = re.compile(
    r"<<<FILE:\s*([^\r\n>]+?)>>>\r?\n(.*?)\r?\n<<<END_FILE>>>",
    re.DOTALL,
)
TOOL_BLOCK_RE = re.compile(
    r"<<<TOOL>>>\s*(\{.*?\})\s*<<<END_TOOL>>>",
    re.DOTALL,
)
MENTIONED_PATH_RE = re.compile(
    r"\b((?:app|components|lib|src|scripts|data|workers)/[A-Za-z0-9_./-]+\.(?:ts|tsx|js|mjs|py|json))\b"
)
RETRY_AFTER_RE = re.compile(r"Retry after\s+(\d+)\s*s", re.IGNORECASE)
REFUSAL_PATTERNS = (
    "i'm sorry, i can't",
    "i am sorry, i cannot",
    "i cannot assist with",
    "i can't assist with",
    "i cannot fulfill this request",
    "i can't fulfill this request",
    "as an ai, i cannot",
)

SEARCHABLE_DIRS = ("app", "components", "lib", "src", "scripts", "data", "workers")

AGENT_OPENAI_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Search across repository source files for a regex or keyword pattern, returning matching file paths and line numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Keyword or regex to search for"},
                },
                "required": ["pattern"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file in the repository.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path in the repo"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "replace_in_file",
            "description": "Replace exact target text with replacement text in an existing repository file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path in the repo"},
                    "target": {"type": "string", "description": "Exact existing substring to replace"},
                    "replacement": {"type": "string", "description": "New replacement substring"},
                },
                "required": ["path", "target", "replacement"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create or overwrite a file in the repository with complete code contents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path in the repo"},
                    "content": {"type": "string", "description": "Complete file contents to write"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_checks",
            "description": "Run repository Python unit tests and TypeScript typechecking to verify changes.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List files in a repository directory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "subdir": {"type": "string", "description": "Relative directory path (default '.')"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web (Wikipedia & GitHub) for documentation, libraries, or technical facts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query string"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Download text or JSON from a public HTTPS URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Public HTTPS URL"},
                },
                "required": ["url"],
            },
        },
    },
]

AGENT_SYSTEM_PROMPT = """You are the VelvetMotion Autonomous Coding Agent running inside GitHub Actions on the repository `hampusi97/velvetmotion-ai` (Next.js 15 TypeScript app in `app/`, `components/`, `lib/`, Tauri v2 Rust desktop app in `src-tauri/`, and Python 3.12 modules in `src/`).

Your job is to inspect code, find and fix bugs, build features, and search the web using your tools:
- `search_code` (`{"pattern": "..."}`) — Find where functions, components, or errors live in the repo.
- `read_file` (`{"path": "..."}`) — Read a file before modifying it.
- `replace_in_file` (`{"path": "...", "target": "...", "replacement": "..."}`) — Edit existing code cleanly.
- `write_file` (`{"path": "...", "content": "..."}`) — Create or overwrite a file.
- `run_checks` (`{}`) — Run unit tests and typechecks to verify your changes.
- `list_files`, `web_search`, `fetch_url`.

You can also create or overwrite files by outputting blocks in this exact format:
<<<FILE: relative/path/to/file.ext>>>
<complete file contents>
<<<END_FILE>>>

Always make real, clean, working edits when asked to fix or build something."""


def is_refusal_response(text: str) -> bool:
    """Return True when `text` looks like a generic safety-filter refusal rather than an answer."""
    lowered = (text or "").strip().lower()
    if not lowered or len(lowered) > 400:
        return False
    return any(pat in lowered for pat in REFUSAL_PATTERNS)


def resolve_safe_path(workspace_root: str, relative_path: str) -> str:
    """Resolve `relative_path` inside `workspace_root` while blocking traversal and protected paths."""
    cleaned = (relative_path or "").strip().replace("\\", "/")
    if not cleaned or cleaned.startswith("/") or ".." in cleaned.split("/"):
        raise ValueError(f"Unsafe relative path: {relative_path!r}")
    root_real = os.path.realpath(workspace_root)
    target_real = os.path.realpath(os.path.join(root_real, cleaned))
    if target_real != root_real and not target_real.startswith(root_real + os.sep):
        raise ValueError(f"Path escapes workspace root: {relative_path!r}")
    rel_inside = os.path.relpath(target_real, root_real).replace("\\", "/")
    if (
        rel_inside == ".git"
        or rel_inside.startswith(".git/")
        or rel_inside.startswith(".github/workflows/")
    ):
        raise ValueError(f"Modification of protected path is not allowed: {rel_inside!r}")
    return target_real


def is_public_https_url(url: str) -> bool:
    """Validate that `url` is a public HTTPS URL and does not resolve to private/loopback IPs."""
    try:
        parsed = urllib.parse.urlparse(url.strip())
        if parsed.scheme != "https" or not parsed.hostname:
            return False
        if parsed.username or parsed.password:
            return False
        hostname = parsed.hostname
        infos = socket.getaddrinfo(hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
        if not infos:
            return False
        for info in infos:
            ip_str = info[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_reserved
                or ip_obj.is_unspecified
            ):
                return False
        return True
    except Exception:
        return False


def fetch_url(url: str, max_bytes: int = 32_768, timeout: int = 15) -> str:
    """Safely download text content from a public HTTPS URL with SSRF protection."""
    if not is_public_https_url(url):
        raise ValueError(f"Refusing non-public or non-HTTPS URL: {url!r}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "VelvetMotion-Agent/1.0 (+https://github.com/hampusi97/velvetmotion-ai)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec B310
        raw = resp.read(max_bytes)
        return raw.decode("utf-8", errors="replace")


def web_search(query: str, max_results: int = 5) -> str:
    """Search public web knowledge via Wikipedia OpenSearch and GitHub repositories API."""
    cleaned = (query or "").strip()
    if not cleaned:
        return "Empty search query."
    results: List[str] = []
    encoded = urllib.parse.quote(cleaned)

    wiki_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={encoded}&limit={max_results}&namespace=0&format=json"
    try:
        raw = fetch_url(wiki_url, max_bytes=16_384, timeout=10)
        parsed = json.loads(raw)
        if isinstance(parsed, list) and len(parsed) >= 4:
            titles, descs, links = parsed[1], parsed[2], parsed[3]
            for title, desc, link in zip(titles, descs, links):
                results.append(f"- [Wikipedia] {title}: {desc} ({link})")
    except Exception:
        pass

    gh_url = f"https://api.github.com/search/repositories?q={encoded}&per_page={max_results}"
    try:
        raw = fetch_url(gh_url, max_bytes=24_576, timeout=10)
        parsed = json.loads(raw)
        for item in (parsed.get("items") or [])[:max_results]:
            full_name = item.get("full_name", "")
            description = item.get("description") or "No description"
            html_url = item.get("html_url", "")
            results.append(f"- [GitHub] {full_name}: {description} ({html_url})")
    except Exception:
        pass

    if not results:
        return f"No live search results found for {cleaned!r}."
    return "\n".join(results[: max_results * 2])


def search_code(workspace_root: str, pattern: str, max_matches: int = 40) -> str:
    """Search source files in `workspace_root` for `pattern` and return `file:line: text` matches."""
    cleaned = (pattern or "").strip()
    if not cleaned:
        return "Empty search pattern."
    root_real = os.path.realpath(workspace_root)
    existing_dirs = [d for d in SEARCHABLE_DIRS if os.path.isdir(os.path.join(root_real, d))]
    targets = existing_dirs if existing_dirs else ["."]

    try:
        proc = subprocess.run(
            ["rg", "-n", "--no-heading", "-i", "-m", "5", cleaned, *targets],
            cwd=root_real,
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = [ln for ln in proc.stdout.splitlines() if ln.strip()][:max_matches]
        if lines:
            return "\n".join(lines)
    except Exception:
        pass

    # Pure-Python fallback when ripgrep is unavailable or pattern has special characters
    matches: List[str] = []
    lowered = cleaned.lower()
    for rel in list_files(root_real, ".", max_entries=300):
        if not rel.endswith((".ts", ".tsx", ".js", ".mjs", ".py", ".rs", ".json", ".md")):
            continue
        try:
            text = read_file(root_real, rel, max_chars=30_000)
            for idx, line in enumerate(text.splitlines(), start=1):
                if lowered in line.lower():
                    matches.append(f"{rel}:{idx}: {line.strip()[:160]}")
                    if len(matches) >= max_matches:
                        return "\n".join(matches)
        except Exception:
            continue
    return "\n".join(matches) if matches else f"No matches in repository for {cleaned!r}."


def run_checks(workspace_root: str) -> str:
    """Run fast Python unit tests and optional TypeScript typecheck in `workspace_root`."""
    root_real = os.path.realpath(workspace_root)
    outputs: List[str] = []

    if os.path.isdir(os.path.join(root_real, "src", "tests")):
        py_proc = subprocess.run(
            ["python3", "-B", "-m", "unittest", "discover", "-s", "src/tests", "-p", "test_*.py"],
            cwd=root_real,
            capture_output=True,
            text=True,
            timeout=30,
        )
        status = "PASS" if py_proc.returncode == 0 else "FAIL"
        detail = (py_proc.stdout + "\n" + py_proc.stderr).strip()[-1500:]
        outputs.append(f"[Python unittest: {status}]\n{detail}")

    tsc_bin = os.path.join(root_real, "node_modules", ".bin", "tsc")
    if os.path.exists(tsc_bin):
        ts_proc = subprocess.run(
            [tsc_bin, "--noEmit"],
            cwd=root_real,
            capture_output=True,
            text=True,
            timeout=60,
        )
        status = "PASS" if ts_proc.returncode == 0 else "FAIL"
        detail = (ts_proc.stdout + "\n" + ts_proc.stderr).strip()[-1500:] or "0 TypeScript errors."
        outputs.append(f"[TypeScript tsc --noEmit: {status}]\n{detail}")

    return "\n\n".join(outputs) if outputs else "No test suites detected in workspace."


def list_files(workspace_root: str, subdir: str = ".", max_entries: int = 120) -> List[str]:
    """List workspace files inside `subdir` (excluding `.git`, `node_modules`, `.next`, `out`, `target`)."""
    target_dir = (
        os.path.realpath(workspace_root)
        if subdir in ("", ".")
        else resolve_safe_path(workspace_root, subdir)
    )
    ignored = {".git", "node_modules", ".next", "out", "target", "__pycache__"}
    collected: List[str] = []
    root_real = os.path.realpath(workspace_root)
    for dirpath, dirnames, filenames in os.walk(target_dir):
        dirnames[:] = sorted(d for d in dirnames if d not in ignored)
        for fname in sorted(filenames):
            full = os.path.join(dirpath, fname)
            rel = os.path.relpath(full, root_real).replace("\\", "/")
            collected.append(rel)
            if len(collected) >= max_entries:
                return collected
    return collected


def read_file(workspace_root: str, relative_path: str, max_chars: int = 8000) -> str:
    """Read a text file inside `workspace_root`."""
    safe_path = resolve_safe_path(workspace_root, relative_path)
    with open(safe_path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read(max_chars)


def write_file(workspace_root: str, relative_path: str, content: str) -> str:
    """Create or overwrite a text file inside `workspace_root`."""
    safe_path = resolve_safe_path(workspace_root, relative_path)
    os.makedirs(os.path.dirname(safe_path), exist_ok=True)
    text = content if content.endswith("\n") else content + "\n"
    with open(safe_path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return os.path.relpath(safe_path, os.path.realpath(workspace_root)).replace("\\", "/")


def replace_in_file(workspace_root: str, relative_path: str, target: str, replacement: str) -> str:
    """Replace `target` with `replacement` in `relative_path` inside `workspace_root`."""
    safe_path = resolve_safe_path(workspace_root, relative_path)
    with open(safe_path, "r", encoding="utf-8") as fh:
        existing = fh.read()
    if target not in existing:
        raise ValueError(f"Target snippet not found in {relative_path}")
    updated = existing.replace(target, replacement, 1)
    with open(safe_path, "w", encoding="utf-8") as fh:
        fh.write(updated)
    return os.path.relpath(safe_path, os.path.realpath(workspace_root)).replace("\\", "/")


def apply_external_ai_blocks(text: str, workspace_root: str) -> List[str]:
    """Parse and apply all `<<<FILE: path>>>...<<<END_FILE>>>` blocks found in `text`."""
    modified: List[str] = []
    for match in FILE_BLOCK_RE.finditer(text or ""):
        rel_path = match.group(1).strip()
        file_content = match.group(2)
        saved_rel = write_file(workspace_root, rel_path, file_content)
        if saved_rel not in modified:
            modified.append(saved_rel)
    return modified


def build_repo_context(prompt: str, workspace_root: str) -> str:
    """Pre-load any repository files explicitly mentioned in `prompt` so the agent can edit them immediately."""
    snippets: List[str] = []
    seen = set()
    for match in MENTIONED_PATH_RE.finditer(prompt or ""):
        rel_path = match.group(1)
        if rel_path in seen:
            continue
        seen.add(rel_path)
        try:
            content = read_file(workspace_root, rel_path, max_chars=6000)
            snippets.append(f"--- Existing file `{rel_path}` ---\n{content}")
        except Exception:
            pass
    return "\n\n".join(snippets)


def verify_workspace_changes(workspace_root: str, modified_files: List[str]) -> List[str]:
    """Verify syntax of modified Python/TypeScript files; roll back any file that fails compilation."""
    notes: List[str] = []
    for py_file in list(modified_files):
        if not py_file.endswith(".py"):
            continue
        full_py = os.path.join(workspace_root, py_file)
        if not os.path.exists(full_py):
            continue
        proc = subprocess.run(
            ["python3", "-m", "py_compile", py_file],
            cwd=workspace_root,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            subprocess.run(["git", "checkout", "--", py_file], cwd=workspace_root, check=False)
            modified_files.remove(py_file)
            notes.append(f"Rolled back {py_file} due to Python syntax error: {proc.stderr.strip()}")
        else:
            notes.append(f"Verified Python syntax for {py_file}")

    ts_files = [f for f in modified_files if f.endswith((".ts", ".tsx"))]
    tsc_bin = os.path.join(workspace_root, "node_modules", ".bin", "tsc")
    if ts_files and os.path.exists(tsc_bin):
        proc = subprocess.run(
            [tsc_bin, "--noEmit"],
            cwd=workspace_root,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode != 0:
            for ts_f in ts_files:
                subprocess.run(["git", "checkout", "--", ts_f], cwd=workspace_root, check=False)
                if ts_f in modified_files:
                    modified_files.remove(ts_f)
            notes.append(f"Rolled back TypeScript edits due to tsc error: {proc.stdout.strip()[:300]}")
        else:
            notes.append(f"Verified TypeScript compilation for {', '.join(ts_files)}")
    return notes


def execute_tool_call(
    workspace_root: str,
    tool_name: str,
    args: Dict[str, Any],
    modified_files: List[str],
) -> str:
    """Execute a single agent tool call inside `workspace_root`."""
    if tool_name == "search_code":
        return search_code(workspace_root, str(args.get("pattern", "")))
    if tool_name == "run_checks":
        return run_checks(workspace_root)
    if tool_name == "web_search":
        return web_search(str(args.get("query", "")))
    if tool_name == "fetch_url":
        return fetch_url(str(args.get("url", "")))
    if tool_name == "list_files":
        files = list_files(workspace_root, str(args.get("subdir", ".")))
        return "\n".join(files)
    if tool_name == "read_file":
        return read_file(workspace_root, str(args.get("path", "")))
    if tool_name == "write_file":
        rel = write_file(workspace_root, str(args.get("path", "")), str(args.get("content", "")))
        if rel not in modified_files:
            modified_files.append(rel)
        return f"Successfully wrote {rel}"
    if tool_name == "replace_in_file":
        rel = replace_in_file(
            workspace_root,
            str(args.get("path", "")),
            str(args.get("target", "")),
            str(args.get("replacement", "")),
        )
        if rel not in modified_files:
            modified_files.append(rel)
        return f"Successfully updated {rel}"
    return f"Unknown tool: {tool_name}"


def _extract_message_text_and_tools(data: Dict[str, Any]) -> str:
    """Extract assistant content and convert any native OpenAI `tool_calls` into `<<<TOOL>>>` blocks."""
    choice = (data.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    parts: List[str] = []
    content = (msg.get("content") or "").strip()
    if content:
        parts.append(content)
    for tc in msg.get("tool_calls") or []:
        fn = tc.get("function") or {}
        name = fn.get("name") or ""
        raw_args = fn.get("arguments") or "{}"
        if name:
            try:
                parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except Exception:
                parsed_args = {"query": str(raw_args)}
            parts.append(f"<<<TOOL>>>{json.dumps({'tool': name, 'args': parsed_args})}<<<END_TOOL>>>")
    return "\n".join(parts).strip()


@dataclass
class TupleResult:
    text: str
    provider: str


@dataclass
class AgentRunResult:
    response: str
    provider: str
    modified_files: List[str] = field(default_factory=list)
    tool_logs: List[str] = field(default_factory=list)


def _query_local_ollama(
    messages: List[Dict[str, str]],
    ollama_model: Optional[str] = None,
) -> Optional[TupleResult]:
    """Query local uncensored Ollama server on 127.0.0.1:11434 when available."""
    base_url = (os.environ.get("OLLAMA_HOST_URL") or "http://127.0.0.1:11434").rstrip("/")
    model_name = ollama_model or os.environ.get("VELVETMOTION_OLLAMA_MODEL") or "dolphin-mistral:7b"
    try:
        payload = json.dumps(
            {
                "model": model_name,
                "messages": messages,
                "stream": False,
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/v1/chat/completions",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:  # nosec B310
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            text = _extract_message_text_and_tools(data)
            if text:
                return TupleResult(text=text, provider=f"Local Uncensored Ollama ({model_name})")
    except Exception:
        return None
    return None


def _query_pollinations_with_retry(
    messages: List[Dict[str, str]],
    include_tools: bool = True,
    max_attempts: int = 3,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> Optional[TupleResult]:
    """Query `text.pollinations.ai/openai`, respecting `HTTP 402/429` `Retry after Ns` cooldowns."""
    body: Dict[str, Any] = {
        "model": "openai",
        "referrer": "velvetmotion",
        "messages": messages,
    }
    if include_tools:
        body["tools"] = AGENT_OPENAI_TOOLS
    payload = json.dumps(body).encode("utf-8")

    for attempt in range(max_attempts):
        req = urllib.request.Request(
            "https://text.pollinations.ai/openai",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) VelvetMotion/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:  # nosec B310
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
                text = _extract_message_text_and_tools(data)
                live_model = data.get("model") or "openai"
                if text:
                    return TupleResult(
                        text=text,
                        provider=f"Keyless Live LLM ({live_model} via text.pollinations.ai)",
                    )
        except urllib.error.HTTPError as err:
            err_body = ""
            try:
                err_body = err.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            if err.code in (402, 429, 502, 503, 504) and attempt < max_attempts - 1:
                m = RETRY_AFTER_RE.search(err_body)
                wait_seconds = min(int(m.group(1)) + 2, 48) if m else 15 * (attempt + 1)
                sleep_fn(float(wait_seconds))
                continue
            break
        except Exception:
            if attempt < max_attempts - 1:
                sleep_fn(5.0)
                continue
            break
    return None


def default_llm_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    include_tools: bool = True,
) -> TupleResult:
    """Query the 4-tier resilient & uncensored LLM router."""
    engine_pref = (os.environ.get("VELVETMOTION_AGENT_ENGINE") or "auto").strip().lower()
    api_key = os.environ.get("UNCENSORED_AI_API_KEY") or os.environ.get("OPENROUTER_API_KEY") or ""
    chosen_model = (
        model
        or os.environ.get("VELVETMOTION_AGENT_MODEL")
        or "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
    )

    # Explicit uncensored local Ollama mode (e.g. dolphin-mistral:7b on GitHub Actions runner)
    if engine_pref == "dolphin-uncensored":
        ollama_res = _query_local_ollama(messages)
        if ollama_res is not None:
            return ollama_res

    # Tier 1: OpenRouter (when UNCENSORED_AI_API_KEY or OPENROUTER_API_KEY is configured)
    if api_key:
        try:
            body: Dict[str, Any] = {"model": chosen_model, "messages": messages}
            if include_tools:
                body["tools"] = AGENT_OPENAI_TOOLS
            payload = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) VelvetMotion/1.0",
                    "X-Title": "VelvetMotion Autonomous Agent",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:  # nosec B310
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
                text = _extract_message_text_and_tools(data)
                if text and not is_refusal_response(text):
                    return TupleResult(text=text, provider=f"OpenRouter ({chosen_model})")
        except Exception:
            pass

    # Tier 2: Keyless GPU Coding LLM with automatic 402/429 cooldown retry
    pollinations_res = _query_pollinations_with_retry(messages, include_tools=include_tools)
    if pollinations_res is not None and not is_refusal_response(pollinations_res.text):
        return pollinations_res

    # Tier 3: Local Uncensored Ollama (automatic fallback if Tier 2 refused or was unreachable)
    ollama_res = _query_local_ollama(messages)
    if ollama_res is not None:
        return ollama_res

    # If Pollinations returned a refusal and Ollama wasn't running, still return Pollinations text
    if pollinations_res is not None:
        return pollinations_res

    # Tier 4: Deterministic local fallback
    user_prompt = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
    return TupleResult(
        text=generate_response(user_prompt),
        provider="Local Python Fallback (src.velvetmotion)",
    )


def run_agent_task(
    prompt: str,
    workspace_root: str = ".",
    max_steps: int = 4,
    llm_fn: Optional[Callable[[List[Dict[str, str]]], TupleResult]] = None,
) -> AgentRunResult:
    """Execute an autonomous coding task, modify files in the workspace, and verify syntax."""
    modified_files: List[str] = []
    tool_logs: List[str] = []

    direct_files = apply_external_ai_blocks(prompt, workspace_root)
    if direct_files:
        modified_files.extend(direct_files)
        verify_notes = verify_workspace_changes(workspace_root, modified_files)
        summary = f"Applied {len(modified_files)} file block(s) directly from prompt: {', '.join(modified_files)}"
        return AgentRunResult(
            response=f"{summary}\n\n{prompt}",
            provider="Direct External AI Patch Application",
            modified_files=modified_files,
            tool_logs=[summary, *verify_notes],
        )

    preloaded_context = build_repo_context(prompt, workspace_root)
    full_user_prompt = f"{prompt}\n\n{preloaded_context}" if preloaded_context else prompt

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": full_user_prompt},
    ]

    last_text = ""
    last_provider = "Local Python Fallback (src.velvetmotion)"
    total_steps = max(1, min(max_steps, 6))

    for step in range(total_steps):
        is_last_step = step == total_steps - 1
        if llm_fn is not None:
            completion = llm_fn(messages)
        else:
            completion = default_llm_completion(messages, include_tools=not is_last_step)

        if not completion.provider.startswith("Local Python Fallback") or not last_text:
            last_provider = completion.provider
        last_text = completion.text

        for saved in apply_external_ai_blocks(last_text, workspace_root):
            if saved not in modified_files:
                modified_files.append(saved)

        tool_matches = list(TOOL_BLOCK_RE.finditer(last_text))
        if not tool_matches or is_last_step:
            break

        observations: List[str] = []
        needs_followup = False
        for match in tool_matches:
            raw_json = match.group(1)
            try:
                parsed = json.loads(raw_json)
                tool_name = str(parsed.get("tool", ""))
                tool_args = parsed.get("args") or {}
                output = execute_tool_call(workspace_root, tool_name, tool_args, modified_files)
                log_entry = f"[Step {step + 1}] {tool_name}({json.dumps(tool_args)}) -> {len(output)} chars"
                tool_logs.append(log_entry)
                observations.append(f"Tool `{tool_name}` output:\n{output}")
                if tool_name in ("search_code", "read_file", "list_files", "web_search", "fetch_url", "run_checks"):
                    needs_followup = True
            except Exception as exc:
                err_msg = f"Tool error: {exc}"
                tool_logs.append(f"[Step {step + 1}] {err_msg}")
                observations.append(err_msg)
                needs_followup = True

        if modified_files and not needs_followup:
            break

        if step == total_steps - 2:
            messages[0] = {
                "role": "system",
                "content": "You are the VelvetMotion Autonomous Coding Agent. Based on the tool outputs below, apply any needed code changes (`<<<FILE: path>>>...<<<END_FILE>>>`) and summarize your solution clearly.",
            }
        messages.append({"role": "assistant", "content": "Executed requested tool calls."})
        messages.append(
            {
                "role": "user",
                "content": "\n\n".join(observations)
                + f"\n\nOriginal request: {prompt}\nContinue and apply any needed file edits or provide your final answer.",
            }
        )

    verify_notes = verify_workspace_changes(workspace_root, modified_files)
    tool_logs.extend(verify_notes)
    cleaned_final = TOOL_BLOCK_RE.sub("", last_text).strip()
    if not cleaned_final and modified_files:
        cleaned_final = (
            f"Autonomously modified {len(modified_files)} file(s): {', '.join(modified_files)}\n\n"
            + "\n".join(f"- {entry}" for entry in tool_logs)
        )
    elif not cleaned_final:
        cleaned_final = last_text

    return AgentRunResult(
        response=cleaned_final,
        provider=last_provider,
        modified_files=modified_files,
        tool_logs=tool_logs,
    )
