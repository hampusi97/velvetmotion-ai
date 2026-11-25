"""Autonomous tool-calling coding agent for VelvetMotion AI.

Supports:
1. Web search (`web_search`) and safe HTTPS downloading (`fetch_url` with SSRF guard).
2. Repository inspection (`list_files`, `read_file`) and sandboxed code editing
   (`write_file`, `replace_in_file`).
3. Applying structured `<<<FILE: path/to/file>>>...<<<END_FILE>>>` blocks pasted
   directly from any external uncensored AI website, or autonomously planning and
   executing multi-step tool calls via the 3-tier LLM router (OpenRouter ->
   keyless Pollinations OpenAI endpoint -> local `src.velvetmotion` fallback).
"""

from __future__ import annotations

import ipaddress
import json
import os
import re
import socket
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

AGENT_SYSTEM_PROMPT = """You are the VelvetMotion Autonomous Coding Agent.
You can search the web, download public HTTPS resources, read repository files, and write or edit code files.

To call a tool when you need more information, output one or more tool blocks in this exact format:
<<<TOOL>>>
{"tool": "web_search", "args": {"query": "your search query"}}
<<<END_TOOL>>>

Available tools:
- `web_search`: `{"query": "..."}` — Search the web for documentation, facts, or packages.
- `fetch_url`: `{"url": "https://..."}` — Download text/JSON/code from a public HTTPS URL.
- `list_files`: `{"subdir": "."}` — List files in a repository directory.
- `read_file`: `{"path": "relative/path.ts"}` — Read a file from the repository.
- `replace_in_file`: `{"path": "relative/path.ts", "target": "old text", "replacement": "new text"}` — Replace exact text in an existing file.

To create or overwrite a file in the repository, output a file block in this exact format:
<<<FILE: relative/path/to/file.ext>>>
<complete file contents>
<<<END_FILE>>>

Always provide clear explanations alongside any tool calls or file blocks."""


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

    # 1. Wikipedia OpenSearch summary
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

    # 2. GitHub public repository search
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
    with open(safe_path, "w", encoding="utf-8") as fh:
        fh.write(content)
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
        saved_rel = write_file(workspace_root, rel_path, file_content + ("\n" if not file_content.endswith("\n") else ""))
        if saved_rel not in modified:
            modified.append(saved_rel)
    return modified


def execute_tool_call(
    workspace_root: str,
    tool_name: str,
    args: Dict[str, Any],
    modified_files: List[str],
) -> str:
    """Execute a single agent tool call inside `workspace_root`."""
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
        return f"Wrote {rel}"
    if tool_name == "replace_in_file":
        rel = replace_in_file(
            workspace_root,
            str(args.get("path", "")),
            str(args.get("target", "")),
            str(args.get("replacement", "")),
        )
        if rel not in modified_files:
            modified_files.append(rel)
        return f"Updated {rel}"
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


def default_llm_completion(messages: List[Dict[str, str]], model: Optional[str] = None) -> TupleResult:
    """Query the 3-tier LLM router: OpenRouter -> Keyless Pollinations OpenAI -> local fallback."""
    api_key = os.environ.get("UNCENSORED_AI_API_KEY") or os.environ.get("OPENROUTER_API_KEY") or ""
    chosen_model = model or os.environ.get("VELVETMOTION_AGENT_MODEL") or "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"

    # Tier 1: OpenRouter
    if api_key:
        try:
            payload = json.dumps({"model": chosen_model, "messages": messages}).encode("utf-8")
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
                if text:
                    return TupleResult(text=text, provider=f"OpenRouter ({chosen_model})")
        except Exception:
            pass

    # Tier 2: Keyless Live OpenAI-compatible LLM (text.pollinations.ai)
    try:
        payload = json.dumps(
            {
                "model": "openai",
                "referrer": "velvetmotion",
                "messages": messages,
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            "https://text.pollinations.ai/openai",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) VelvetMotion/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:  # nosec B310
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            text = _extract_message_text_and_tools(data)
            live_model = data.get("model") or "openai"
            if text:
                return TupleResult(
                    text=text,
                    provider=f"Keyless Live LLM ({live_model} via text.pollinations.ai)",
                )
    except Exception:
        pass

    # Tier 3: Local deterministic fallback
    user_prompt = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
    return TupleResult(
        text=generate_response(user_prompt),
        provider="Local Python Fallback (src.velvetmotion)",
    )


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


def run_agent_task(
    prompt: str,
    workspace_root: str = ".",
    max_steps: int = 3,
    llm_fn: Callable[[List[Dict[str, str]]], TupleResult] = default_llm_completion,
) -> AgentRunResult:
    """Execute an autonomous coding task or apply external AI file blocks directly."""
    modified_files: List[str] = []
    tool_logs: List[str] = []

    # Fast path: if the user pasted `<<<FILE: ...>>>` blocks from an external AI website,
    # apply them immediately without needing another LLM call.
    direct_files = apply_external_ai_blocks(prompt, workspace_root)
    if direct_files:
        modified_files.extend(direct_files)
        summary = f"Applied {len(direct_files)} file block(s) directly from prompt: {', '.join(direct_files)}"
        return AgentRunResult(
            response=f"{summary}\n\n{prompt}",
            provider="Direct External AI Patch Application",
            modified_files=modified_files,
            tool_logs=[summary],
        )

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    last_text = ""
    last_provider = "Local Python Fallback (src.velvetmotion)"

    for step in range(max(1, min(max_steps, 5))):
        completion = llm_fn(messages)
        last_text = completion.text
        last_provider = completion.provider

        # Apply any `<<<FILE: ...>>>` blocks emitted in this turn
        for saved in apply_external_ai_blocks(last_text, workspace_root):
            if saved not in modified_files:
                modified_files.append(saved)

        # Parse and execute any `<<<TOOL>>>{...}<<<END_TOOL>>>` calls
        tool_matches = list(TOOL_BLOCK_RE.finditer(last_text))
        if not tool_matches or step == max_steps - 1:
            break

        observations: List[str] = []
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
            except Exception as exc:
                err_msg = f"Tool error: {exc}"
                tool_logs.append(f"[Step {step + 1}] {err_msg}")
                observations.append(err_msg)

        messages[0] = {
            "role": "system",
            "content": "You are the VelvetMotion Autonomous Coding Agent. Tools have already been executed and their results are provided below. Do NOT call any more tools. Provide your complete final answer and any `<<<FILE: path>>>...<<<END_FILE>>>` blocks now.",
        }
        messages.append({"role": "assistant", "content": "Executed requested tool calls."})
        messages.append(
            {
                "role": "user",
                "content": "\n\n".join(observations)
                + f"\n\nOriginal request: {prompt}\nProvide your complete final response now without calling further tools.",
            }
        )

    cleaned_final = TOOL_BLOCK_RE.sub("", last_text).strip() or last_text
    return AgentRunResult(
        response=cleaned_final,
        provider=last_provider,
        modified_files=modified_files,
        tool_logs=tool_logs,
    )
