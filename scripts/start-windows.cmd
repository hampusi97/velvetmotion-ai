@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==================================================
echo   VelvetMotion AI - Windows Local Companion Setup
echo ==================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js 20+ is not installed or not on PATH.
  echo Install Node.js from https://nodejs.org/ and run this script again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/3] Installing npm dependencies...
  call npm install
  if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/3] node_modules found.
)

where python >nul 2>nul
if %errorlevel% equ 0 (
  echo [2/3] Launching local ComfyUI / Forge / Ollama CORS proxy on http://127.0.0.1:8787 ...
  start "VelvetMotion Local Media Proxy" /min python workers\local_media_proxy.py --host 127.0.0.1 --port 8787
) else (
  echo [2/3] Python not found on PATH; skipping optional local media proxy.
)

echo [3/3] Launching VelvetMotion AI on http://localhost:3000 ...
start "" "http://localhost:3000"
call npm run dev
