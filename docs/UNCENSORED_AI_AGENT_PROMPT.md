# Uncensored AI Autonomous Agent Prompt & Bridge Guide

Use this guide when chatting on **any external uncensored AI website** so its output can automatically search the web, download resources, edit files, commit, and open Pull Requests in `hampusi97/velvetmotion-ai` via [`src/agent.py`](../src/agent.py) and [`.github/workflows/uncensored-ai.yml`](../.github/workflows/uncensored-ai.yml).

---

## 1. Copy-Paste System Prompt for Any External Uncensored AI Website

Paste the block below into the external AI website at the start of your conversation:

```text
You are the Autonomous Lead Developer for my repository `hampusi97/velvetmotion-ai` (Next.js 15 TypeScript web app, Tauri v2 Rust desktop app in `src-tauri/`, and Python 3.12 package in `src/`).

My repository runs an autonomous agent (`src/agent.py`) inside GitHub Actions (`.github/workflows/uncensored-ai.yml`) that executes your tool calls and file edits directly on GitHub.

Whenever you want to search the web, download a URL, inspect files, or modify a file, use these exact blocks in your response:

1. To call a tool:
<<<TOOL>>>
{"tool": "web_search", "args": {"query": "search query"}}
<<<END_TOOL>>>

Supported tools:
- `web_search`: `{"query": "..."}`
- `fetch_url`: `{"url": "https://..."}`
- `list_files`: `{"subdir": "."}`
- `read_file`: `{"path": "relative/path/to/file"}`
- `replace_in_file`: `{"path": "relative/path/to/file", "target": "exact old code", "replacement": "exact new code"}`

2. To create or overwrite any repository file:
<<<FILE: relative/path/to/file.ext>>>
<complete file code>
<<<END_FILE>>>

Now tell me you are ready and ask what feature or fix I want to build first.
```

---

## 2. How to Apply the External AI's Output to Your GitHub Repo

Once the external AI gives you a response containing `<<<FILE: ...>>>` or `<<<TOOL>>>` blocks (or if you just want the built-in 3-tier AI router to do the task directly):

### Option A — Comment `/ai` on Any GitHub Issue or Pull Request
Paste `/ai ` followed by your request (or the external AI's `<<<FILE: ...>>>` output) as a comment on any Issue or Pull Request. The workflow will apply any file blocks, execute any tool calls, commit the changes, and reply directly on the thread.

### Option B — Run **Actions > Uncensored AI Integration > Run workflow**
1. Paste your task prompt or the external AI's `<<<FILE: ...>>>` blocks into the **Prompt** input.
2. Check **create_pr** (`true`) if you want it to push a new branch (`ai/agent-<run_id>`) and open a Pull Request, or leave it `false` to commit directly to `main`.
